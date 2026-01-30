import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import {
  ContractConfiguration,
  PullTestEnvironment,
  PushModelTestContext,
  PushTestEnvironment,
} from "@redstone-finance/chain-agnostic-oracle-tests";
import { ContractParamsProviderMock } from "@redstone-finance/sdk";
import { createSandboxClient, SandboxClient } from "@redstone-finance/suiangria";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  buildPackage,
  DEFAULT_GAS_BUDGET,
  makeSuiConfig,
  SuiAdapterContractOps,
  SuiConfig,
  SuiContractConnector,
} from "../../src";
import { SuiContractDeployer } from "../../src/SuiContractDeployer";

export class SuiTestEnvironment implements PushTestEnvironment, PullTestEnvironment {
  private readonly connector: SuiContractConnector;
  private readonly config: SuiConfig;

  constructor(
    private readonly sui: SuiClient,
    private readonly sandbox: SandboxClient,
    private readonly keypair: Keypair,
    private readonly packageId: string,
    private readonly adminCapId: string,
    private readonly priceAdapterId: string
  ) {
    this.config = makeSuiConfig({
      packageId: this.packageId,
      priceAdapterObjectId: this.priceAdapterId,
      maxTxSendAttempts: 2,
      gasMultiplier: 1.1,
    });

    this.connector = new SuiContractConnector(sui, this.config, keypair);
  }

  async pull(
    dataFeedIds: string[],
    payloadGenerator: (timestamp: number) => string
  ): Promise<number[]> {
    const paramsProvider = new ContractParamsProviderMock(dataFeedIds, "", () => {
      const payload = payloadGenerator(this.sandbox.clockApi().getTimeMs());

      return Buffer.from(payload.replace("0x", ""));
    });
    const digest = await this.connector.writePricesFromPayloadToContract(paramsProvider);

    await this.connector.waitForTransaction(digest);

    return await this.read(dataFeedIds);
  }

  async configure(configuration: ContractConfiguration): Promise<void> {
    const tx = new Transaction();
    tx.setSender(this.keypair.toSuiAddress());

    SuiAdapterContractOps.updateConfig(
      tx,
      {
        ...this.config,
        signerCountThreshold: configuration.requiredSignersCount,
        maxTimestampDelayMs: RedstoneCommon.minToMs(3),
        maxTimestampAheadMs: RedstoneCommon.minToMs(1),
        signers: configuration.authorisedSigners.map((wallet) => wallet.address),
        trustedUpdaters: [this.keypair.toSuiAddress()],
        minIntervalBetweenUpdatesMs: RedstoneCommon.secsToMs(40),
        initializeTxGasBudget: DEFAULT_GAS_BUDGET,
      },
      this.adminCapId
    );

    const bytes = await tx.build({ client: this.sui });

    const response = await this.sui.signAndExecuteTransaction({
      transaction: bytes,
      signer: this.keypair,
    });

    if (response.errors) {
      throw new Error(RedstoneCommon.stringifyError(new AggregateError(response.errors)));
    }

    await this.sui.waitForTransaction({ digest: response.digest });
  }

  async update(
    dataFeedIds: string[],
    payloadGenerator: (context: PushModelTestContext) => string,
    instructionsContext: PushModelTestContext[]
  ): Promise<void> {
    const paramsProvider = new ContractParamsProviderMock(dataFeedIds, "", () => {
      const payload = payloadGenerator({
        timestamp: this.sandbox.clockApi().getTimeMs(),
        instructions: instructionsContext,
      });

      return Buffer.from(payload.replace("0x", ""));
    });
    const digest = await this.connector.writePricesFromPayloadToContract(paramsProvider);

    await this.connector.waitForTransaction(digest);
  }

  async read(dataFeedIds: string[]): Promise<number[]> {
    return (
      await this.connector.readPricesFromContract(
        new ContractParamsProviderMock(dataFeedIds, "", () => Buffer.from([]))
      )
    ).map((bn) => Number(bn));
  }

  waitForNewBlock(): Promise<void> {
    this.sandbox.clockApi().advanceByMillis(250);
    this.sandbox.behaviourApi().bumpCheckpoint();

    return Promise.resolve();
  }

  wait(durationSeconds: number): Promise<void> {
    this.sandbox.clockApi().advanceByMillis(durationSeconds * 1_000);

    return Promise.resolve();
  }

  getCurrentTimeInMs(): Promise<number> {
    return Promise.resolve(this.sandbox.clockApi().getTimeMs());
  }

  async finish() {
    return await Promise.resolve();
  }
}

export function getTestEnvFunction() {
  const build = buildPackage("sui/contracts/price_adapter", "testnet");

  return () => getTestEnv(build);
}

export async function getTestEnv(build: { modules: string[]; dependencies: string[] }) {
  const keypair = Secp256k1Keypair.generate();

  const { client, sandbox } = createSandboxClient();

  sandbox.mintSui(keypair.toSuiAddress(), Number(100_000_000_000n * MIST_PER_SUI));
  sandbox.clockApi().setTimeMs(Date.now());

  const deployer = new SuiContractDeployer(client, keypair);

  const { packageId, adminCapId, priceAdapterId } = await deployer.deployFromBuild(build);

  return new SuiTestEnvironment(
    client as unknown as SuiClient,
    sandbox,
    keypair,
    packageId,
    adminCapId,
    priceAdapterId
  );
}
