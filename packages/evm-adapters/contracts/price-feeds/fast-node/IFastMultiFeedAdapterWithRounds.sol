// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {IFastMultiFeedAdapter} from "./IFastMultiFeedAdapter.sol";

/**
 * Interface for fast adapter with round history.
 */
interface IFastMultiFeedAdapterWithRounds is IFastMultiFeedAdapter {
  /// @notice Event emitted when a new round is created
  event RoundCreated(uint256 value, uint256 updaterTimestamp, bytes32 dataFeedId, uint256 blockTimestamp, uint256 roundId, uint256 updaterId);

  /// @notice Error thrown when requested roundId is zero
  error RoundIdIsZero(bytes32 dataFeedId);
  /// @notice Error thrown when requested roundId is too high
  error RoundIdTooHigh(bytes32 dataFeedId, uint256 roundId, uint256 latestRoundId);
  /// @notice Error thrown when requested roundId is no longer available
  error RoundIdTooOld(bytes32 dataFeedId, uint256 roundId);

  /// @notice Returns the latest round ID for a given data feed
  /// @param dataFeedId The data feed identifier
  function getLatestRoundId(bytes32 dataFeedId) external view returns (uint256 latestRoundId);

  /// @notice Returns price data for a specific round of a data feed
  /// @param dataFeedId The data feed identifier
  /// @param roundId The round identifier
  function getRoundData(bytes32 dataFeedId, uint256 roundId) external view returns (PriceData memory);
}
