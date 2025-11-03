import {
  ContractConfiguration,
  PullTestEnvironment,
  PushModelTestContext,
  PushTestEnvironment,
} from "@redstone-finance/chain-agnostic-oracle-tests";
import { ContractParamsProviderMock } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import { LiteSVM } from "litesvm";
import { createSolanaConfig, SolanaContractConnector } from "../../src";
import { setUpEnv } from "../setup-env";
import { LiteSVMAgnosticTestsConnection } from "./TestConnection";

const MS_IN_SECS = 1_000;

export class SolanaTestEnvironment implements PushTestEnvironment, PullTestEnvironment {
  constructor(
    private readonly connector: SolanaContractConnector,
    private readonly svm: LiteSVM
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
    const paramsProvider = new ContractParamsProviderMock(dataFeedIds, "", () => {
      const currentTimeMs = RedstoneCommon.secsToMs(Number(this.svm.getClock().unixTimestamp));

      const payload = payloadGenerator({
        timestamp: currentTimeMs,
        instructions: instructionsContext,
      });

      return Buffer.from(payload.replace("0x", ""));
    });

    try {
      const hash = await (
        await this.connector.getAdapter()
      ).writePricesFromPayloadToContract(paramsProvider);

      await this.connector.waitForTransaction(hash);
    } catch {
      console.error(`Failed tx`);
    }
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

  async waitForNewBlock(): Promise<void> {
    this.svm.expireBlockhash();
    const clock = this.svm.getClock();
    clock.slot += BigInt(1);
    this.svm.setClock(clock);

    await this.wait(1);
  }

  wait(durationSeconds: number): Promise<void> {
    const clock = this.svm.getClock();
    clock.unixTimestamp += BigInt(durationSeconds);
    this.svm.setClock(clock);

    return Promise.resolve();
  }

  getCurrentTimeInMs(): Promise<number> {
    return Promise.resolve(RedstoneCommon.secsToMs(Number(this.svm.getClock().unixTimestamp)));
  }

  async pull(
    dataFeedIds: string[],
    payloadGenerator: (timestamp: number) => string
  ): Promise<number[]> {
    const paramsProvider = new ContractParamsProviderMock(dataFeedIds, "", () => {
      const currentTimeMs = RedstoneCommon.secsToMs(Number(this.svm.getClock().unixTimestamp));
      const payload = payloadGenerator(currentTimeMs);

      return Buffer.from(payload.replace("0x", ""));
    });
    const digest = await (
      await this.connector.getAdapter()
    ).writePricesFromPayloadToContract(paramsProvider);

    await this.connector.waitForTransaction(digest);

    return await this.read(dataFeedIds);
  }

  finish(): Promise<void> {
    return Promise.resolve();
  }
}
export function getTestEnvFunction() {
  execSync("make build-test -C solana", { stdio: "inherit" });

  return () => getTestEnv();
}

export function getTestEnv() {
  const { svm, trustedSigner, programId } = setUpEnv();

  const clock = svm.getClock();
  clock.unixTimestamp = BigInt(Math.floor(Date.now() / MS_IN_SECS));
  svm.setClock(clock);

  const connection = new LiteSVMAgnosticTestsConnection(svm);
  const connector = new SolanaContractConnector(
    connection,
    programId.toBase58(),
    trustedSigner,
    createSolanaConfig({
      maxTxSendAttempts: 2,
      expectedTxDeliveryTimeMs: 100,
      gasLimit: 200_000,
    })
  );

  return Promise.resolve(new SolanaTestEnvironment(connector, svm));
}
