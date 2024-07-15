// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@redstone-finance/evm-connector/contracts/mocks/RedstoneConsumerNumericMock.sol";

contract RedstoneMockConsumer is RedstoneConsumerNumericMock {
  function getUniqueSignersThreshold() public view virtual override returns (uint8) {
    return 2;
  }

  function getLatestPrice(bytes32 dataFeedId) public view returns (uint256) {
    return getOracleNumericValueFromTxMsg(dataFeedId);
  }

  function getLatestPricesForManyAssets(
    bytes32[] memory dataFeedIds
  ) public view returns (uint256[] memory) {
    return getOracleNumericValuesFromTxMsg(dataFeedIds);
  }
}
