import {
  ContractConfiguration,
  PullTestEnvironment,
  PushModelTestContext,
  PushTestEnvironment,
} from "@redstone-finance/chain-agnostic-oracle-tests";
import { ContractParamsProviderMock, getLastRoundDetails } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import { LiteSVM } from "litesvm";
import { createSolanaConfig, SolanaWriteContractAdapter } from "../../src";
import { setUpEnv } from "../setup-env";
import { LiteSVMAgnosticTestsConnection } from "./TestConnection";

const MS_IN_SECS = 1_000;
const UNIQUE_SIGNERS_COUNT = 5;

export class SolanaTestEnvironment implements PushTestEnvironment, PullTestEnvironment {
  constructor(
    private readonly adapter: SolanaWriteContractAdapter,
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
  ) {
    const paramsProvider = this.makeParamsProvider(dataFeedIds, (timestamp) =>
      payloadGenerator({ timestamp, instructions: instructionsContext })
    );

    try {
      await this.adapter.writePricesFromPayloadToContract(paramsProvider);
    } catch {
      console.error(`Failed tx`);
    }
  }

  async read(dataFeedIds: string[]): Promise<number[]> {
    const contractData = await this.adapter.readContractData(dataFeedIds);

    return dataFeedIds.map((feedId) => Number(getLastRoundDetails(contractData, feedId).lastValue));
  }

  async waitForNewBlock() {
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
    const paramsProvider = this.makeParamsProvider(dataFeedIds, payloadGenerator);
    await this.adapter.writePricesFromPayloadToContract(paramsProvider);

    return await this.read(dataFeedIds);
  }

  finish(): Promise<void> {
    return Promise.resolve();
  }

  private makeParamsProvider(dataFeedIds: string[], buildPayload: (timestamp: number) => string) {
    return new ContractParamsProviderMock(
      dataFeedIds,
      "",
      () => {
        const currentTimeMs = RedstoneCommon.secsToMs(Number(this.svm.getClock().unixTimestamp));

        return Buffer.from(buildPayload(currentTimeMs).replace("0x", ""));
      },
      UNIQUE_SIGNERS_COUNT
    );
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
  const connector = new SolanaWriteContractAdapter(
    connection,
    programId.toBase58(),
    trustedSigner,
    createSolanaConfig({
      maxTxSendAttempts: 2,
      expectedTxDeliveryTimeMs: 100,
    })
  );

  return Promise.resolve(new SolanaTestEnvironment(connector, svm));
}
