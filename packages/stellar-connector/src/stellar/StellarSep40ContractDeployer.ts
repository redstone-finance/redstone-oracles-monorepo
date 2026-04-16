import { Address } from "@stellar/stellar-sdk";
import { Sep40Asset, assetToScVal, feedMappingsToScVal } from "../sep-40-utils";
import { StellarContractDeployer } from "./StellarContractDeployer";

export class StellarSep40ContractDeployer extends StellarContractDeployer {
  async deploySep40(
    wasmPath: string,
    owner: Address,
    baseAsset: Sep40Asset,
    feedMappings: { feed: string; asset: Sep40Asset }[]
  ) {
    return await this.deploy(wasmPath, [
      owner.toScVal(),
      assetToScVal(baseAsset),
      feedMappingsToScVal(feedMappings),
    ]);
  }
}
