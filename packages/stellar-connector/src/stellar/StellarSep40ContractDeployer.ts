import { Address } from "@stellar/stellar-sdk";
import { Asset, assetToScVal, feedMappingsToScVal } from "../sep-40-utils";
import { StellarContractDeployer } from "./StellarContractDeployer";

export class StellarSep40ContractDeployer extends StellarContractDeployer {
  async deploySep40(
    wasmPath: string,
    owner: Address,
    baseAsset: Asset,
    feedMappings: { feed: string; asset: Asset }[]
  ) {
    return await this.deploy(wasmPath, [
      owner.toScVal(),
      assetToScVal(baseAsset),
      feedMappingsToScVal(feedMappings),
    ]);
  }
}
