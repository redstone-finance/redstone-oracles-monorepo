// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@redstone-finance/evm-connector/contracts/data-services/PrimaryProdDataServiceConsumerBase.sol";
import "./ExampleBase.sol";

contract PrimaryProdExample is PrimaryProdDataServiceConsumerBase, ExampleBase {
  function getUniqueSignersThreshold() public view virtual override returns (uint8) {
    return 5;
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
