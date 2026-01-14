import { Signer } from "ethers";
import {
  AddressSortedLinkedListWithMedian__factory,
  MentoAdapterMock__factory,
  MockSortedOracles__factory,
  MultiFeedAdapterWithoutRoundsMock__factory,
  PriceFeedsAdapterWithoutRoundsMock__factory,
} from "../typechain-types";

export async function deployMentoAdapterMock(signer?: Signer) {
  const mentoAdapter = await new MentoAdapterMock__factory(signer).deploy();
  await mentoAdapter.deployed();

  return mentoAdapter;
}

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

export async function deployMentoAdapterWithSortedOraclesMock(signer?: Signer) {
  const sortedOracles = await deployMockSortedOracles(signer);
  const mentoAdapter = await deployMentoAdapterMock(signer);
  await mentoAdapter.setSortedOraclesAddress(sortedOracles.address);

  return { mentoAdapter, sortedOracles };
}

export const deployMockSortedOracles = async (signer?: Signer) => {
  // Deploying AddressSortedLinkedListWithMedian library
  const sortedLinkedListContract = await new AddressSortedLinkedListWithMedian__factory(
    signer
  ).deploy();
  await sortedLinkedListContract.deployed();

  // Deploying MockSortedOracles contract
  const contract = await new MockSortedOracles__factory(
    {
      "contracts/custom-integrations/mento/linkedlists/AddressSortedLinkedListWithMedian.sol:AddressSortedLinkedListWithMedian":
        sortedLinkedListContract.address,
    },
    signer
  ).deploy();
  await contract.deployed();

  return contract;
};
