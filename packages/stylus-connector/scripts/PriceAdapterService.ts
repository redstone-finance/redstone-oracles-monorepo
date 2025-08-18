import { Contract, ethers, Signer } from "ethers";
import {
  IStylusAdapter,
  LastUpdateDetailsStructOutput,
} from "../abi/IStylusAdapter";
import { abi as PRICE_ADAPTER_ABI } from "../abi/StylusAdapter.json";

export class PriceAdapterService {
  private readonly contract: Contract & IStylusAdapter;
  private readonly signer: Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.signer = signer;

    this.contract = new ethers.Contract(
      contractAddress,
      PRICE_ADAPTER_ABI,
      this.signer
    ) as IStylusAdapter;
  }

  async readPriceData(
    feedIds: string[]
  ): Promise<LastUpdateDetailsStructOutput[]> {
    return await this.contract.getLastUpdateDetailsUnsafeForMany(feedIds);
  }

  async writePrices(feeds: string[], payload: string) {
    return await this.contract.writePrices(feeds, payload);
  }
}
