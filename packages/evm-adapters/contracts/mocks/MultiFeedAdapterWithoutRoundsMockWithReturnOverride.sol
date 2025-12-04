// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {MultiFeedAdapterWithoutRoundsMock} from "./MultiFeedAdapterWithoutRoundsMock.sol";

contract MultiFeedAdapterWithoutRoundsMockWithReturnOverride is MultiFeedAdapterWithoutRoundsMock {
  uint256 private blockTimestampToReturn;
  uint256 private lastValueToReturn;
  bool private lastValueSet;

  function setBlockTimestampToReturn(uint256 blockTimestamp) public {
    blockTimestampToReturn = blockTimestamp;
  }

  function setLastValueToReturn(uint256 lastValue) public {
    lastValueToReturn = lastValue;
    lastValueSet = true;
  }

  function getLastUpdateDetails(bytes32 dataFeedId) public view virtual override returns (
    uint256 lastDataTimestamp,
    uint256 lastBlockTimestamp,
    uint256 lastValue
  ) {
    (lastDataTimestamp, lastBlockTimestamp, lastValue) = super.getLastUpdateDetails(dataFeedId);
    if (blockTimestampToReturn > 0) {
      lastBlockTimestamp = blockTimestampToReturn;
    }
    if (lastValueSet) {
      lastValue = lastValueToReturn;
    }
  }
}
