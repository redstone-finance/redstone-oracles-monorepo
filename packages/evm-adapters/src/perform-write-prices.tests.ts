import * as providers from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { consts } from "@redstone-finance/protocol";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { expect } from "chai";
import { EvmAdapterType, getEvmContract } from "./facade/evm/get-evm-contract";
import { getEvmContractAdapter } from "./facade/evm/get-evm-contract-adapter";
import { RedstoneEvmContract } from "./facade/evm/RedstoneEvmContract";

export const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export async function performWritePricesTests(
  provider: providers.Provider,
  config: { adapterContractType: EvmAdapterType; isV6Contract?: boolean },
  deployer: (signer?: Wallet) => Promise<RedstoneEvmContract>,
  txDeliveryManCreator: (signer: Wallet) => Tx.ITxDeliveryMan,
  paramsProvider: ContractParamsProvider
) {
  const signer = new Wallet(TEST_PRIVATE_KEY, provider);
  const deployedContract = await deployer(signer);
  const adapterContract = getEvmContract(
    { ...config, adapterContractAddress: deployedContract.address },
    provider
  );
  const contractAdapter = getEvmContractAdapter(
    config,
    adapterContract,
    txDeliveryManCreator(signer),
    signer
  );

  await contractAdapter.writePricesFromPayloadToContract(paramsProvider);

  return deployedContract;
}

const createNumberFromContract = (price: number) =>
  BigInt(Math.round(price * 10 ** consts.DEFAULT_NUM_VALUE_DECIMALS));

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
