import { abi as RedstoneAdapterBaseAbi } from "../artifacts/contracts/core/RedstoneAdapterBase.sol/RedstoneAdapterBase.json";
import { abi as ISortedOraclesAbi } from "../artifacts/contracts/custom-integrations/mento/ISortedOracles.sol/ISortedOracles.json";
import { abi as MentoAdapterBaseAbi } from "../artifacts/contracts/custom-integrations/mento/MentoAdapterBase.sol/MentoAdapterBase.json";
import PriceFeedsAdapterWithRoundsOneSignerMockArtifact from "../artifacts/contracts/mocks/PriceFeedsAdapterWithRoundsOneSignerMock.sol/PriceFeedsAdapterWithRoundsOneSignerMock.json";
import PriceFeedWithRoundsMockArtifact, {
  abi as PriceFeedWithRoundsMockAbi,
} from "../artifacts/contracts/mocks/PriceFeedWithRoundsMock.sol/PriceFeedWithRoundsMock.json";
import { abi as IPriceFeedAbi } from "../artifacts/contracts/price-feeds/interfaces/IPriceFeed.sol/IPriceFeed.json";
import { abi as PriceFeedsAdapterWithRoundsAbi } from "../artifacts/contracts/price-feeds/with-rounds/PriceFeedsAdapterWithRounds.sol/PriceFeedsAdapterWithRounds.json";
import { abi as PriceFeedWithRoundsAbi } from "../artifacts/contracts/price-feeds/with-rounds/PriceFeedWithRounds.sol/PriceFeedWithRounds.json";
import { abi as MultiFeedAdapterWithoutRoundsAbi } from "../artifacts/contracts/price-feeds/without-rounds/MultiFeedAdapterWithoutRounds.sol/MultiFeedAdapterWithoutRounds.json";

export type {
  IRedstoneAdapter,
  ISortedOracles,
  IStylusAdapter,
  MentoAdapterBase,
  MultiFeedAdapterWithoutRounds,
  PriceFeedBase,
  PriceFeedsAdapterWithRounds,
  PriceFeedsAdapterWithRoundsOneSignerMock,
  PriceFeedWithRounds,
  PriceFeedWithRoundsMock,
  RedstoneAdapterBase,
} from "../typechain-types";
export { EvmContractAdapter } from "./core/contract-interactions/EvmContractAdapter";
export { EvmContractConnector } from "./core/contract-interactions/EvmContractConnector";
export { MentoEvmContractAdapter } from "./core/contract-interactions/MentoEvmContractAdapter";
export { PriceFeedsEvmContractAdapter } from "./core/contract-interactions/PriceFeedsEvmContractAdapter";
export { getSortedOraclesContractAtAddress } from "./custom-integrations/mento/get-sorted-oracles-contract-at-address";
export { EvmPriceFeedContract } from "./facade/evm/EvmPriceFeedContract";
export { getEvmContract } from "./facade/evm/get-evm-contract";
export { getEvmContractAdapter } from "./facade/evm/get-evm-contract-adapter";
export { getEvmContractConnector } from "./facade/evm/get-evm-contract-connector";
export { type RedstoneEvmContract } from "./facade/evm/RedstoneEvmContract";
export {
  deployMentoAdapterMock,
  deployMockSortedOracles,
  deployPriceFeedsAdapterWithoutRoundsMock,
} from "./helpers";
export {
  IPriceFeedAbi,
  ISortedOraclesAbi,
  MentoAdapterBaseAbi,
  MultiFeedAdapterWithoutRoundsAbi,
  PriceFeedsAdapterWithRoundsAbi,
  PriceFeedsAdapterWithRoundsOneSignerMockArtifact,
  PriceFeedWithRoundsAbi,
  PriceFeedWithRoundsMockAbi,
  PriceFeedWithRoundsMockArtifact,
  RedstoneAdapterBaseAbi,
};
