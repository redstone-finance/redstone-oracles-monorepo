import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "./config";
import { SuiAdapterContractOps } from "./SuiAdapterContractOps";
import { SuiClient } from "./SuiClient";
import { DEFAULT_GAS_BUDGET } from "./SuiContractUtil";
import { buildPackage } from "./util";

export class SuiContractDeployer {
  constructor(
    private readonly sui: SuiClient,
    private readonly keypair: Keypair
  ) {}

  async deploy(projectPath: string, env: SuiNetworkName) {
    return await this.deployFromBuild(buildPackage(projectPath, env));
  }

  async deployFromBuild(build: { modules: string[]; dependencies: string[] }) {
    const { modules, dependencies } = build;

    const tx = new Transaction();
    const [upgradeCap] = tx.publish({ modules, dependencies });
    tx.transferObjects([upgradeCap], this.keypair.getPublicKey().toSuiAddress());
    tx.setGasBudget(2n * MIST_PER_SUI);

    const { createdObjects, packageId } = await this.executeAndExtractCreated(tx);

    if (!packageId) {
      throw new Error("Failed to deploy package");
    }

    const adminCapId = createdObjects.find((obj) => obj.type?.includes("AdminCap"))?.objectId;

    if (!adminCapId) {
      throw new Error("AdminCap not found in deploy result");
    }

    const priceAdapterId = await this.initialize(packageId, adminCapId);

    return { packageId, adminCapId, priceAdapterId };
  }

  async initialize(packageId: string, adminCap: string) {
    const tx = new Transaction();
    const dummyConfig = {
      signers: [this.keypair.getPublicKey().toSuiAddress()],
      signerCountThreshold: 1,
      maxTimestampDelayMs: 0,
      maxTimestampAheadMs: 0,
      trustedUpdaters: [],
      minIntervalBetweenUpdatesMs: 0,
      initializeTxGasBudget: 10n * DEFAULT_GAS_BUDGET,
    };

    SuiAdapterContractOps.initialize(tx, dummyConfig, packageId, adminCap);

    const { createdObjects } = await this.executeAndExtractCreated(tx);

    const priceAdapterObject = createdObjects.find((obj) => obj.type?.includes("PriceAdapter"));

    if (!priceAdapterObject) {
      throw new Error("PriceAdapter not found in initialization result");
    }

    return priceAdapterObject.objectId;
  }

  private async executeAndExtractCreated(tx: Transaction) {
    const result = await this.sui.signAndExecute(tx, this.keypair);

    if (result.$kind === "FailedTransaction") {
      throw new Error(
        `Transaction failed, ${RedstoneCommon.stringifyError(result.FailedTransaction)}`
      );
    }
    const txResult = result.Transaction;

    await this.sui.waitForTransaction(txResult.digest);

    const createdIds = txResult.effects.changedObjects
      .filter((obj) => obj.inputState === "DoesNotExist")
      .map((ref) => ref.objectId);

    const response = await this.sui.getObjects(createdIds);

    const createdObjects = response.map((obj) => ({
      objectId: (obj as { objectId: string }).objectId,
      type: (obj as { type?: string }).type,
    }));

    const packageId = createdObjects.find((obj) => obj.type === "package")?.objectId;

    return { createdObjects, packageId, digest: txResult.digest };
  }
}
