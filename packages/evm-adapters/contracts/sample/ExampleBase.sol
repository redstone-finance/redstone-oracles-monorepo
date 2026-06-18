// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "hardhat/console.sol";

abstract contract ExampleBase {

  function getLatestPrice(bytes32 dataFeedId) public virtual view returns (uint256);

  function getLatestPricesForManyAssets(bytes32[] memory dataFeedIds) public virtual view returns (uint256[] memory);
}
