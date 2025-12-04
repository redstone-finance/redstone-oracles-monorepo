// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {IMultiFeedAdapter} from "../price-feeds/interfaces/IMultiFeedAdapter.sol";
import {MultiFeedAdapterWithoutRoundsWithReference} from "../price-feeds/without-rounds/MultiFeedAdapterWithoutRoundsWithReference.sol";

contract MultiFeedAdapterWithoutRoundsWithReferenceMock is MultiFeedAdapterWithoutRoundsWithReference {
  IMultiFeedAdapter private mainAdapter;
  IMultiFeedAdapter private referenceAdapter;

  function init(IMultiFeedAdapter _mainAdapter, IMultiFeedAdapter _referenceAdapter) public {
    mainAdapter = _mainAdapter;
    referenceAdapter = _referenceAdapter;
  }

  function getReferenceSwitchCriteria(bytes32 dataFeedId) public view virtual override returns (uint256 maxAllowedDeviationBps, uint256 maxDataAgeInSeconds) {
    if (dataFeedId == bytes32("USDT") || dataFeedId == bytes32("USDC") || dataFeedId == bytes32("DAI")) {
      return (50 /* 0.5% */, 10 /* 10 seconds */);
    }

    return (100 /* 1% */, 10 /* 10 seconds */);
  }

  function getMainAdapter() public view virtual override returns (IMultiFeedAdapter) {
    return mainAdapter;
  }

  function getReferenceAdapter() public view virtual override returns (IMultiFeedAdapter) {
    return referenceAdapter;
  }
}
