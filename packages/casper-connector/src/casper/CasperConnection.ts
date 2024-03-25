import {
  CasperClient,
  Contracts,
  GetDeployResult,
  Keys,
  RuntimeArgs,
} from "casper-js-sdk";
import { ICasperConnection } from "./ICasperConnection";

export const CSPR_MOTE = 10 ** 9;

const TRANSACTION_TIMEOUT = 600_000;

export class CasperConnection implements ICasperConnection {
  public stateRootHash?: string;

  constructor(
    protected casperClient: CasperClient,
    protected signKeyPair: Keys.AsymmetricKey,
    protected networkName: "casper" | "casper-test"
  ) {}

  async getBlockHeight() {
    const blockInfo = (await this.casperClient.nodeClient.getLatestBlockInfo())
      .block;

    if (!blockInfo) {
      throw new Error("Block info couldnt be fetched");
    }

    return blockInfo.header.height;
  }

  async refreshStateRootHash() {
    this.stateRootHash = await this.casperClient.nodeClient.getStateRootHash();
  }

  getStateRootHash(): string | undefined {
    return this.stateRootHash;
  }

  async waitForDeploy(deployHash: string) {
    return CasperConnection.describeDeployResult(
      await this.casperClient.nodeClient.waitForDeploy(
        deployHash,
        TRANSACTION_TIMEOUT
      )
    );
  }

  async waitForDeploys(deployIds: string[]) {
    (
      await Promise.allSettled(
        deployIds.map((hashId) => this.waitForDeploy(hashId))
      )
    ).forEach((result, index) => {
      switch (result.status) {
        case "rejected":
          return console.log(`Failed to check status #${index}`);
        case "fulfilled":
          if (!result.value) {
            throw new Error(`Failed to send deploy #${index}`);
          }
      }
    });
  }

  async queryContractDictionary<T>(
    contract: Contracts.Contract,
    dictionaryName: string,
    dictionaryItemKey: string,
    decoder: (value: unknown) => T
  ) {
    return decoder(
      (
        await contract.queryContractDictionary(
          dictionaryName,
          dictionaryItemKey,
          this.stateRootHash,
          this.casperClient
        )
      ).value()
    );
  }

  async queryContractData<T>(contract: Contracts.Contract, key: string) {
    return (await contract.queryContractData(
      [key],
      this.casperClient,
      this.stateRootHash
    )) as T;
  }

  async queryGlobalState(key: string) {
    if (!this.stateRootHash) {
      await this.refreshStateRootHash();
    }

    return await this.casperClient.nodeClient.getBlockState(
      this.stateRootHash!,
      key,
      []
    );
  }

  async callEntrypoint(
    contract: Contracts.Contract,
    entryPoint: string,
    csprAmount: number,
    runtimeArgs: RuntimeArgs
  ) {
    const deploy = contract.callEntrypoint(
      entryPoint,
      runtimeArgs,
      this.signKeyPair.publicKey,
      this.networkName,
      CasperConnection.makePaymentAmount(csprAmount),
      [this.signKeyPair]
    );

    return await this.casperClient.putDeploy(deploy);
  }

  private static makePaymentAmount(csprAmount: number) {
    return `${Math.ceil(csprAmount * CSPR_MOTE)}`;
  }

  private static describeDeployResult(deployResult: GetDeployResult) {
    const executionResults = deployResult.execution_results;

    const successes = executionResults.filter(
      (result) => result.result.Success != null
    );
    const failures = executionResults.filter(
      (result) => result.result.Failure != null
    );

    if (failures.length > 0) {
      console.error(
        failures.map((failure) => failure.result.Failure!.error_message)
      );
    } else {
      console.log(
        successes.map((success) => success.result.Success!.cost / CSPR_MOTE)
      );
    }

    return successes.length > 0 && failures.length === 0;
  }
}
