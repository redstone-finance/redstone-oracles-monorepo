import { Signer } from "ethers";
import {
  MultiFeedAdapterWithoutRoundsMock__factory,
  PriceFeedsAdapterWithoutRoundsMock__factory,
} from "../typechain-types";

export async function deployPriceFeedsAdapterWithoutRoundsMock(signer?: Signer) {
  const priceFeedsAdapter = await new PriceFeedsAdapterWithoutRoundsMock__factory(signer).deploy();
  await priceFeedsAdapter.deployed();

  return priceFeedsAdapter;
}

export async function deployMultiFeedAdapterWithoutRoundsMock(signer?: Signer) {
  const multiFeedAdapter = await new MultiFeedAdapterWithoutRoundsMock__factory(signer).deploy();
  await multiFeedAdapter.deployed();

  return multiFeedAdapter;
}
