// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {MultiFeedAdapterWithoutRoundsWithReferenceMock} from "./MultiFeedAdapterWithoutRoundsWithReferenceMock.sol";

contract MultiFeedAdapterWithoutRoundsWithReferenceMicrosecondsMock is MultiFeedAdapterWithoutRoundsWithReferenceMock {
  uint256 internal constant MICROSECONDS_IN_ONE_SECOND = 1_000_000;

  function getReferenceSwitchCriteria(bytes32 dataFeedId) public view virtual override returns (uint256 maxAllowedDeviationBps, uint256 maxRefBlockLag) {
    if (dataFeedId == bytes32("USDT") || dataFeedId == bytes32("USDC") || dataFeedId == bytes32("DAI")) {
      return (50 /* 0.5% */, 10 * MICROSECONDS_IN_ONE_SECOND);
    }

    return (100 /* 1% */, 10 * MICROSECONDS_IN_ONE_SECOND);
  }

  function getBlockTimestamp() public view virtual override returns (uint256) {
    return block.timestamp * MICROSECONDS_IN_ONE_SECOND;
  }
}
