import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber } from "@ethersproject/bignumber";
import { BytesLike } from "@ethersproject/bytes";
import { Contract, ContractTransaction } from "@ethersproject/contracts";
import { abi as PRICE_ADAPTER_ABI } from "../abi/StylusAdapter.json";

export type LastUpdateDetails = {
  dataTimestamp: BigNumber;
  blockTimestamp: BigNumber;
  value: BigNumber;
};

interface StylusAdapterContract {
  callStatic: {
    getLastUpdateDetailsUnsafeForMany: (dataFeedIds: BytesLike[]) => Promise<LastUpdateDetails[]>;
  };
  writePrices: (dataFeedsIds: BytesLike[], payload: BytesLike) => Promise<ContractTransaction>;
}

export class PriceAdapterService {
  private readonly contract: Contract & StylusAdapterContract;
  private readonly signer: Signer;

  constructor(contractAddress: string, signer: Signer) {
    this.signer = signer;

    this.contract = new Contract(contractAddress, PRICE_ADAPTER_ABI, this.signer) as Contract &
      StylusAdapterContract;
  }

  async readPriceData(feedIds: string[]) {
    return await this.contract.callStatic.getLastUpdateDetailsUnsafeForMany(feedIds);
  }

  async writePrices(feeds: string[], payload: string) {
    return await this.contract.writePrices(feeds, payload);
  }
}
