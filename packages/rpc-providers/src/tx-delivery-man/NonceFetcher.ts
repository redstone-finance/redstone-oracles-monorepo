import {
  HARDHAT_CHAIN_ID,
  loggerFactory,
  MultiExecutor,
  RedstoneCommon,
  Tx,
} from "@redstone-finance/utils";
import { providers } from "ethers";
import { getProviderNetworkInfo } from "../common";
import { ProviderExecutor, ProviderWithIdentifier } from "../ProviderExecutor";
import { TxDeliveryOpts } from "./common";

type ProviderWithAddress = ProviderWithIdentifier & { address: string };

const TIMEOUT_ACTIVATION_MS = RedstoneCommon.minToMs(1);
const MIN_PROVIDERS_FOR_AGREEMENT = 3;

export class NonceFetcher {
  private readonly logger = loggerFactory("nonce-fetcher");
  private readonly latestChainNonceExecutor: ProviderExecutor<number, ProviderWithAddress>;
  private readonly pendingChainNonceExecutor: ProviderExecutor<number, ProviderWithAddress>;
  private getTransactionCountTimeoutMs?: number;
  private fnDelegate?: MultiExecutor.FnDelegate;

  constructor(
    private readonly providers: readonly providers.Provider[],
    private opts: Pick<TxDeliveryOpts, "getSingleNonceTimeoutMs">
  ) {
    this.latestChainNonceExecutor = this.createNonceExecutor(Tx.NewestBlockTypeEnum.enum.latest);
    this.pendingChainNonceExecutor = this.createNonceExecutor(Tx.NewestBlockTypeEnum.enum.pending);

    this.fnDelegate = MultiExecutor.QuarantinedListFnDelegate.getCachedConfig(
      this.providers.map(NonceFetcher.getProviderNetworkInfo).map((info) => info.url),
      NonceFetcher.getProviderNetworkInfo(this.providers[0], 0).chainId
    ).delegate;

    this.setUpTimeouts();
  }

  private setUpTimeouts() {
    if (this.opts.getSingleNonceTimeoutMs) {
      setTimeout(() => {
        this.logger.info(`Setting timeoutMs=${this.opts.getSingleNonceTimeoutMs}`);
        this.getTransactionCountTimeoutMs = this.opts.getSingleNonceTimeoutMs;
      }, TIMEOUT_ACTIVATION_MS);
    }
  }

  private createNonceExecutor(blockTag: Tx.NewestBlockType) {
    return new ProviderExecutor<number, ProviderWithAddress>(
      `getTransactionCount(${blockTag})`,
      ({ provider, address }) => NonceFetcher.getTransactionCount(provider, address, blockTag),
      this.logger
    );
  }

  async fetchNonceFromChain(address: string, blockTag: Tx.NewestBlockType) {
    const consensusExecutor = this.getConsensusExecutor(this.getTransactionCountTimeoutMs);
    const providerExecutor = this.getProviderExecutor(blockTag);

    const functions = this.providers.map((provider, index) => {
      const identifier = NonceFetcher.getProviderNetworkInfo(provider, index).url;

      return {
        fn: () =>
          providerExecutor.run({
            provider,
            identifier,
            address,
          }),
        index,
        name: `fetchNonceFromChain(${blockTag})`,
        description: identifier,
        delegate: this.fnDelegate,
      };
    });

    return await consensusExecutor.execute(functions);
  }

  static getProviderNetworkInfo(provider: providers.Provider, index: number) {
    return getProviderNetworkInfo(provider, {
      chainId: HARDHAT_CHAIN_ID,
      url: `Provider #${index}`,
    });
  }

  private getConsensusExecutor(timeoutMs?: number) {
    return this.providers.length < MIN_PROVIDERS_FOR_AGREEMENT
      ? new MaxFromAllConsensusExecutor(timeoutMs)
      : new MultiExecutor.AgreementExecutor<number>(
          MultiExecutor.DEFAULT_CONFIG.agreementQuorumNumber,
          timeoutMs
        );
  }

  private getProviderExecutor(blockTag: Tx.NewestBlockType) {
    switch (blockTag) {
      case Tx.NewestBlockTypeEnum.enum.latest:
        return this.latestChainNonceExecutor;
      case Tx.NewestBlockTypeEnum.enum.pending:
        return this.pendingChainNonceExecutor;
    }
  }

  private static async getTransactionCount(
    p: providers.Provider,
    address: string,
    blockTag: Tx.NewestBlockType
  ) {
    const count = await p.getTransactionCount(address, blockTag);

    if (!RedstoneCommon.isDefined(count) || !Number.isFinite(count)) {
      throw new Error(`Count ${RedstoneCommon.stringify(count)} is undefined or infinite`);
    }

    return count;
  }
}

class MaxFromAllConsensusExecutor extends MultiExecutor.ConsensusExecutor<number> {
  constructor(timeoutMs?: number) {
    super(1, timeoutMs);
  }

  override aggregate(results: number[]) {
    return Math.max(...results);
  }

  protected override verifySettlements<R>(
    successfulResults: R[],
    errorResults: unknown[],
    totalLength: number
  ) {
    if (errorResults.length === totalLength) {
      throw new AggregateError(errorResults);
    }

    return successfulResults.length + errorResults.length === totalLength;
  }
}
