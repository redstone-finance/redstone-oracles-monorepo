// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {PriceFeedWithoutRoundsForMultiFeedAdapterMock} from "./PriceFeedWithoutRoundsForMultiFeedAdapterMock.sol";

contract ETHPriceFeedWithoutRoundsForMultiFeedAdapterMock is PriceFeedWithoutRoundsForMultiFeedAdapterMock {
  function getDataFeedId() public view virtual override returns (bytes32) {
    return bytes32("ETH");
  }
}
