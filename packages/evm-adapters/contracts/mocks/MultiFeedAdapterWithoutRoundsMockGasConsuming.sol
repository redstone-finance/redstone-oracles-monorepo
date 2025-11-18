// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {MultiFeedAdapterWithoutRoundsMock} from "./MultiFeedAdapterWithoutRoundsMock.sol";

contract MultiFeedAdapterWithoutRoundsMockGasConsuming is MultiFeedAdapterWithoutRoundsMock {
  function getLastUpdateDetails(bytes32 dataFeedId) public view virtual override returns (
    uint256 lastDataTimestamp,
    uint256 lastBlockTimestamp,
    uint256 lastValue
  ) {
    uint256[] memory arr = new uint256[](100_000);
    return super.getLastUpdateDetails(dataFeedId);
  }
}
