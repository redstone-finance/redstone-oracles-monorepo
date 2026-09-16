import { BigNumber } from "@ethersproject/bignumber";
import {
  evmWritableContract,
  signAndBroadcastTx,
  waitForSuccessfulTransaction,
  type EvmPopulatedTx,
  type EvmProvider,
} from "@redstone-finance/rpc-providers";
import { type Wallet } from "@redstone-finance/signing";
import { RedstoneCommon } from "@redstone-finance/utils";
import { abi as PRICE_ADAPTER_ABI } from "../abi/StylusAdapter.json";

export type LastUpdateDetails = {
  dataTimestamp: BigNumber;
  blockTimestamp: BigNumber;
  value: BigNumber;
};

interface StylusAdapterContract {
  callStatic: {
    getLastUpdateDetailsUnsafeForMany: (
      dataFeedIds: RedstoneCommon.BytesLike[]
    ) => Promise<LastUpdateDetails[]>;
  };
  populateTransaction: {
    writePrices: (
      dataFeedsIds: RedstoneCommon.BytesLike[],
      payload: RedstoneCommon.BytesLike
    ) => Promise<EvmPopulatedTx>;
  };
}

export class PriceAdapterService {
  private readonly contract: StylusAdapterContract;

  constructor(
    private readonly contractAddress: string,
    private readonly provider: EvmProvider,
    private readonly wallet: Wallet
  ) {
    this.contract = evmWritableContract<StylusAdapterContract>(
      contractAddress,
      PRICE_ADAPTER_ABI,
      provider,
      wallet.address
    );
  }

  async readPriceData(feedIds: string[]) {
    return await this.contract.callStatic.getLastUpdateDetailsUnsafeForMany(feedIds);
  }

  async writePrices(feeds: string[], payload: string) {
    const { data } = await this.contract.populateTransaction.writePrices(feeds, payload);
    const broadcastedTx = await signAndBroadcastTx(this.provider, this.wallet, {
      to: this.contractAddress,
      data,
    });

    return await waitForSuccessfulTransaction(this.provider, broadcastedTx);
  }
}
