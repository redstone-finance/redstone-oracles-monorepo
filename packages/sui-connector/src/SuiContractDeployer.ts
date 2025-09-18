import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { DEFAULT_GAS_BUDGET } from "./SuiContractUtil";
import { SuiPricesContractAdapter } from "./SuiPricesContractAdapter";
import { buildPackage } from "./util";

export class SuiContractDeployer {
  constructor(
    private readonly sui: SuiClient,
    private readonly keypair: Keypair
  ) {}

  async deploy(projectPath: string) {
    return await this.deployFromBuild(buildPackage(projectPath));
  }

  async deployFromBuild(build: { modules: string[]; dependencies: string[] }) {
    const { modules, dependencies } = build;

    const tx = new Transaction();

    const [upgradeCap] = tx.publish({
      modules,
      dependencies,
    });

    tx.transferObjects([upgradeCap], this.keypair.getPublicKey().toSuiAddress());

    tx.setGasBudget(2n * MIST_PER_SUI);

    const result = await this.sui.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    await this.sui.waitForTransaction({ digest: result.digest });

    const packageId = result.objectChanges?.find(
      (change) => change.type === "published"
    )?.packageId;

    const adminCapObject = result.objectChanges?.find(
      (change) => change.type === "created" && change.objectType.includes("AdminCap")
    );

    if (adminCapObject?.type !== "created") {
      throw new Error("Already checked");
    }

    const adminCapId = adminCapObject.objectId;

    if (!packageId) {
      throw new Error("Failed to deploy package");
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

    SuiPricesContractAdapter.initialize(tx, dummyConfig, packageId, adminCap);

    const result = await this.sui.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    const priceAdapterObject = result.objectChanges?.find(
      (change) => change.type === "created" && change.objectType.includes("PriceAdapter")
    );

    if (priceAdapterObject?.type !== "created") {
      throw new Error("Already checked");
    }

    await this.sui.waitForTransaction({ digest: result.digest });

    return priceAdapterObject.objectId;
  }
}
