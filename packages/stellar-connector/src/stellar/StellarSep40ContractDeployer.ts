import { Address } from "@stellar/stellar-sdk";
import { assetToScVal, feedMappingsToScVal, Sep40Asset } from "../sep-40-types";
import { StellarContractDeployer } from "./StellarContractDeployer";

export class StellarSep40ContractDeployer extends StellarContractDeployer {
  async deploySep40(
    wasmPath: string,
    owner: Address,
    baseAsset: Sep40Asset,
    feedMappings: { feed: string; asset: Sep40Asset; decimals?: number }[]
  ) {
    return await this.deploy(wasmPath, [
      owner.toScVal(),
      assetToScVal(baseAsset),
      feedMappingsToScVal(feedMappings),
    ]);
  }
}
