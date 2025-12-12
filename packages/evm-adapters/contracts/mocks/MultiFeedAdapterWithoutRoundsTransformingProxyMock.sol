// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {IMultiFeedAdapter} from "../price-feeds/interfaces/IMultiFeedAdapter.sol";
import {MultiFeedAdapterWithoutRoundsTransformingProxy} from "../price-feeds/without-rounds/MultiFeedAdapterWithoutRoundsTransformingProxy.sol";

contract MultiFeedAdapterWithoutRoundsTransformingProxyMock is MultiFeedAdapterWithoutRoundsTransformingProxy {
  uint256 internal constant MICROSECONDS_IN_ONE_SECOND = 1_000_000;
  uint256 internal constant MICROSECONDS_IN_ONE_MILLISECOND = 1_000;

  IMultiFeedAdapter private originalAdapter;

  function init(IMultiFeedAdapter _originalAdapter) public {
    originalAdapter = _originalAdapter;
  }

  function getOriginalAdapter() public view override returns (IMultiFeedAdapter) {
    return originalAdapter;
  }

  function _transformLastUpdateDetails(uint256 dataTs, uint256 blockTs, uint256 value) internal view virtual override returns (
    uint256 lastDataTimestamp,
    uint256 lastBlockTimestamp,
    uint256 lastValue
  ) {
    lastDataTimestamp = dataTs * MICROSECONDS_IN_ONE_MILLISECOND;
    lastBlockTimestamp = blockTs * MICROSECONDS_IN_ONE_SECOND;
    lastValue = value;
  }
}
