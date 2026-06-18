// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@redstone-finance/evm-connector/contracts/data-services/PrimaryDemoDataServiceConsumerBase.sol";
import "./ExampleBase.sol";

contract PrimaryDemoExample is PrimaryDemoDataServiceConsumerBase, ExampleBase {
  function getUniqueSignersThreshold() public view virtual override returns (uint8) {
    return 2;
  }

  function getLatestPrice(bytes32 dataFeedId) public override view returns (uint256) {
    return getOracleNumericValueFromTxMsg(dataFeedId);
  }

  function getLatestPricesForManyAssets(
    bytes32[] memory dataFeedIds
  ) public override view returns (uint256[] memory) {
    return getOracleNumericValuesFromTxMsg(dataFeedIds);
  }
}
