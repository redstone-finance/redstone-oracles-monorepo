// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {IMultiFeedAdapter} from "../interfaces/IMultiFeedAdapter.sol";

/**
 * @title MultiFeedAdapterWithoutRoundsWithReference
 * @author The Redstone Oracles team
 * @dev Returns a single value per data feed by querying a main adapter and a reference adapter as a sanity check.
 *      Designed to improve stability while introducing new, faster (but less battle-tested) oracle nodes and relayers.
 *      Combines a new main adapter with a proven reference one: by default, the fresher data is taken, expected to come
 *      from the main adapter. If the main adapter fails or shows unexpected deviation, the reference adapter is used instead.
 */
abstract contract MultiFeedAdapterWithoutRoundsWithReference is IMultiFeedAdapter {
  // Percentage of gasleft, used only when this is above DEFAULT_ADAPTER_GAS_LIMIT
  // not 100% to leave gas for the rest (incl. second adapter), not 50% to avoid large unused-but-paid gas on some chains (e.g. Monad)
  uint256 internal constant ADAPTER_GAS_PERCENT_IF_DEFAULT_CROSSED = 75;
  uint256 internal constant DEFAULT_ADAPTER_GAS_LIMIT = 2_000_000;

  error UnsupportedFunctionCall();
  error BothAdaptersFailed(bytes32 dataFeedId);

  function getMainAdapter() public view virtual returns (IMultiFeedAdapter);
  function getReferenceAdapter() public view virtual returns (IMultiFeedAdapter);

  /**
   * @dev Should be overridden by the implementation contract. Defines when to switch from the main adapter to the reference adapter
   * @param dataFeedId The data feed identifier
   * @return maxAllowedDeviationBps The value deviation between adapters (in basis points) that triggers a switch
   * @return maxRefBlockLag The maximum allowed lag of the reference adapter's last update compared to the current block timestamp for
   *                        the reference data to be considered fresh. It must have the same units that getBlockTimestamp() returns
   */
  function getReferenceSwitchCriteria(bytes32 dataFeedId) public view virtual returns (uint256 maxAllowedDeviationBps, uint256 maxRefBlockLag);

  /// @dev This function can be overridden to support timestamps in different units (e.g. microseconds instead of seconds)
  function getBlockTimestamp() public view virtual returns (uint256) {
    return block.timestamp;
  }

  /// @dev Important! Please check it and override if needed. This helps limit gas consumption from a potential attack by one adapter
  ///      Recommended: set to 30–40% of the maximum allowed gas per call on the chain you deploy the contract on
  function getGasLimitForGetLastUpdateDetailsCall() public view virtual returns (uint256) {
    return _max(gasleft() * ADAPTER_GAS_PERCENT_IF_DEFAULT_CROSSED / 100, DEFAULT_ADAPTER_GAS_LIMIT);
  }

  function getLastUpdateDetails(bytes32 dataFeedId) public view returns (
    uint256 lastDataTimestamp,
    uint256 lastBlockTimestamp,
    uint256 lastValue
  ) {
    (bool mainOk, uint256 mainDataTimestamp, uint256 mainBlockTimestamp, uint256 mainValue) =
      _safeGetLastUpdateDetails(getMainAdapter(), dataFeedId);
    (bool refOk, uint256 refDataTimestamp, uint256 refBlockTimestamp, uint256 refValue) =
      _safeGetLastUpdateDetails(getReferenceAdapter(), dataFeedId);

    // Revert if both adapters failed
    if (!mainOk && !refOk) revert BothAdaptersFailed(dataFeedId);

    // If only one succeeded, return that one immediately
    if (mainOk != refOk) {
      return mainOk
        ? (mainDataTimestamp, mainBlockTimestamp, mainValue)
        : (refDataTimestamp, refBlockTimestamp, refValue);
    }

    // If ref is fresher - return it immediately
    if (refDataTimestamp > mainDataTimestamp) {
      return (refDataTimestamp, refBlockTimestamp, refValue);
    }

    // If main is fresher or same, we check the deviation and freshness of ref
    (uint256 maxAllowedDeviationBps, uint256 maxRefBlockLag) = getReferenceSwitchCriteria(dataFeedId);
    uint256 deviation = calculateDeviationBpsSafe(mainValue, refValue);
    bool isRefDataFresh = (getBlockTimestamp() - refBlockTimestamp) <= maxRefBlockLag;

    // Due to the freshness check we should push reference data more often than `maxRefBlockLag`
    return (deviation > maxAllowedDeviationBps && isRefDataFresh)
      ? (refDataTimestamp, refBlockTimestamp, refValue)
      : (mainDataTimestamp, mainBlockTimestamp, mainValue);
  }

  /// @dev We need to override this function, because it's used in latestAnswer function in the PriceFeedBase contract
  function getValueForDataFeed(bytes32 dataFeedId) public view returns (uint256) {
    (/* dataTs */, /* blockTs */, uint256 lastValue) = getLastUpdateDetails(dataFeedId);
    return lastValue;
  }

  /// @dev Calculates deviation in basis points (1% = 100 bps)
  function calculateDeviationBpsSafe(uint256 value1, uint256 value2) public pure returns (uint256) {
    if (value1 == value2) return 0;
    (uint256 maxVal, uint256 minVal) = value1 > value2 ? (value1, value2) : (value2, value1);
    return (maxVal - minVal) * 10_000 / maxVal;
  }

  function _safeGetLastUpdateDetails(IMultiFeedAdapter adapter, bytes32 dataFeedId) internal view returns (bool ok, uint256 lastDataTimestamp, uint256 lastBlockTimestamp, uint256 lastValue) {
    try adapter.getLastUpdateDetails{gas: getGasLimitForGetLastUpdateDetailsCall()}(dataFeedId) returns (uint256 dataTs, uint256 blockTs, uint256 value) {
      bool success = value > 0 && blockTs <= getBlockTimestamp(); // blockTs should not be greater than current block timestamp to avoid underflow during refBlockLag calculation
      return (success, dataTs, blockTs, value);
    } catch {
      return (false, 0, 0, 0);
    }
  }

  function _max(uint256 a, uint256 b) internal pure returns (uint256) {
    return a > b ? a : b;
  }

  /// @dev Returns batch stats about last updates. It's convenient to use it in monitoring tools
  function getLastUpdateDetailsUnsafeForMany(bytes32[] memory dataFeedIds) external view returns (LastUpdateDetails[] memory detailsForFeeds) {
    detailsForFeeds = new LastUpdateDetails[](dataFeedIds.length);
    for (uint256 i = 0; i < dataFeedIds.length;) {
      (detailsForFeeds[i].dataTimestamp, detailsForFeeds[i].blockTimestamp, detailsForFeeds[i].value) = getLastUpdateDetails(dataFeedIds[i]);
      unchecked { i++; } // reduces gas costs
    }
  }

  function updateDataFeedsValuesPartial(bytes32[] memory) external pure override {
    revert UnsupportedFunctionCall();
  }
  function getLastUpdateDetailsUnsafe(bytes32) external pure override returns (uint256, uint256, uint256) {
    revert UnsupportedFunctionCall();
  }
  function getValuesForDataFeeds(bytes32[] memory) external pure override returns (uint256[] memory) {
    revert UnsupportedFunctionCall();
  }
  function getDataTimestampFromLatestUpdate(bytes32) external pure override returns (uint256) {
    revert UnsupportedFunctionCall();
  }
  function getBlockTimestampFromLatestUpdate(bytes32) external pure override returns (uint256) {
    revert UnsupportedFunctionCall();
  }
}
