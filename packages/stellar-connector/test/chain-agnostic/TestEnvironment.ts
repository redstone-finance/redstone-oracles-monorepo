import {
  ContractConfiguration,
  PullTestEnvironment,
  PushModelTestContext,
  PushTestEnvironment,
} from "@redstone-finance/chain-agnostic-oracle-tests";
import { getLedgerInfo, makeSandbox, MarsRover } from "@redstone-finance/mars-rover";
import { ContractParamsProviderMock } from "@redstone-finance/sdk";
import { Keypair } from "@stellar/stellar-sdk";
import { execSync } from "child_process";
import {
  PriceAdapterStellarContractConnector,
  StellarClient,
  StellarContractDeployer,
  StellarOperationSender,
} from "../../src";
import { StellarSigner } from "../../src/stellar/StellarSigner";

const TRUSTED_UPDATER_SECRET = "SCXBXWXPZ2AJJXOSARWPHYXZUYRE2CCGL2CPAV3CVLPYTBCTAT4HCTDL";
const WASM_PATH = "stellar/target/agnostic-tests/redstone_adapter.wasm";

export class StellarTestEnvironment implements PushTestEnvironment, PullTestEnvironment {
  constructor(
    private readonly rover: MarsRover,
    private readonly connector: PriceAdapterStellarContractConnector
  ) {}

  configure(_: ContractConfiguration): Promise<void> {
    // non configurable contract

    return Promise.resolve();
  }

  async update(
    dataFeedIds: string[],
    payloadGenerator: (context: PushModelTestContext) => string,
    instructionsContext: PushModelTestContext[]
  ): Promise<void> {
    const info = getLedgerInfo(this.rover);

    const paramsProvider = new ContractParamsProviderMock(dataFeedIds, "", () => {
      const payload = payloadGenerator({
        timestamp: info.timestamp * 1_000,
        instructions: instructionsContext,
      });

      return Buffer.from(payload.replace("0x", ""));
    });

    const hash = await (
      await this.connector.getAdapter()
    ).writePricesFromPayloadToContract(paramsProvider);

    await this.connector.waitForTransaction(hash);
  }

  async read(dataFeedIds: string[]): Promise<number[]> {
    return (
      await (
        await this.connector.getAdapter()
      ).readPricesFromContract(
        new ContractParamsProviderMock(dataFeedIds, "", () => Buffer.from([]))
      )
    ).map((bn) => Number(bn));
  }

  waitForNewBlock(): Promise<void> {
    const info = getLedgerInfo(this.rover);

    this.rover.setSequence(info.sequence_number + 1);
    this.rover.setTime(info.timestamp + 5);

    return Promise.resolve();
  }

  wait(durationSeconds: number): Promise<void> {
    const info = getLedgerInfo(this.rover);

    this.rover.setTime(info.timestamp + durationSeconds);
    this.rover.setSequence(info.sequence_number + 1);

    return Promise.resolve();
  }

  getCurrentTimeInMs(): Promise<number> {
    const info = getLedgerInfo(this.rover);

    return Promise.resolve(info.timestamp * 1_000);
  }

  async pull(
    dataFeedIds: string[],
    payloadGenerator: (timestamp: number) => string
  ): Promise<number[]> {
    const info = getLedgerInfo(this.rover);

    const paramsProvider = new ContractParamsProviderMock(dataFeedIds, "", () => {
      const payload = payloadGenerator(info.timestamp * 1_000);

      return Buffer.from(payload.replace("0x", ""));
    });

    return (await (await this.connector.getAdapter()).getPricesFromPayload(paramsProvider)).map(
      (bn) => Number(bn)
    );
  }

  finish(): Promise<void> {
    return Promise.resolve();
  }
}

export function getTestEnvFunction() {
  execSync("make build-test", { stdio: "inherit" });

  return () => getTestEnv();
}

export async function getTestEnv() {
  const { server, marsRover } = makeSandbox();

  const client = new StellarClient(server);
  const keypair = Keypair.fromSecret(TRUSTED_UPDATER_SECRET);
  marsRover.fundAccount(keypair.xdrPublicKey().toXDR("base64"), 1_000_000_000_000);

  const writer = new StellarOperationSender(new StellarSigner(keypair), client);
  const deployer = new StellarContractDeployer(client, writer);

  const { contractId } = await deployer.deploy(WASM_PATH);

  return new StellarTestEnvironment(
    marsRover,
    new PriceAdapterStellarContractConnector(client, contractId, keypair, {
      expectedTxDeliveryTimeInMs: 10,
      maxTxSendAttempts: 2,
    })
  );
}
