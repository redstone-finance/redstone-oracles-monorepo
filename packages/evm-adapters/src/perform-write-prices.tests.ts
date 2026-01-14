import { ContractParamsProvider } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { expect } from "chai";
import { BigNumber, ethers, Wallet } from "ethers";
import { EvmAdapterType } from "./facade/evm/get-evm-contract";
import { getEvmContractAdapter } from "./facade/evm/get-evm-contract-adapter";
import { RedstoneEvmContract } from "./facade/evm/RedstoneEvmContract";

export const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const createNumberFromContract = (number: number, decimals = 8) =>
  BigNumber.from(number * 10 ** decimals).toBigInt();

export async function performWritePricesTests(
  provider: ethers.providers.Provider,
  config: { adapterContractType: EvmAdapterType; mentoMaxDeviationAllowed?: number },
  deployer: (signer?: Wallet) => Promise<RedstoneEvmContract>,
  txDeliveryManCreator: (adapterContract: RedstoneEvmContract) => Tx.ITxDeliveryMan,
  paramsProvider: ContractParamsProvider
) {
  const signer = new Wallet(TEST_PRIVATE_KEY, provider);

  // Deploy contract
  const adapterContract = await deployer(signer);

  // Update prices
  const contractAdapter = getEvmContractAdapter(
    config,
    adapterContract,
    txDeliveryManCreator(adapterContract)
  );
  await contractAdapter.writePricesFromPayloadToContract(paramsProvider);

  return adapterContract;
}

export async function checkDataValues(
  adapterContract: RedstoneEvmContract,
  feedEntries: { feedId: string; price: number }[]
) {
  const dataFeedsValues = await adapterContract.getValuesForDataFeeds(
    feedEntries.map((entry) => entry.feedId),
    {
      blockTag: await adapterContract.provider.getBlockNumber(),
    }
  );

  feedEntries.forEach((entry, index) =>
    expect(dataFeedsValues[index]).to.be.equal(createNumberFromContract(entry.price))
  );
}
