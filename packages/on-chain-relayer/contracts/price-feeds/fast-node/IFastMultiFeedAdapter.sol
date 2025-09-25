// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;
import {IMultiFeedAdapter} from "../interfaces/IMultiFeedAdapter.sol";

/**
 * A contract interface designed for frequent price updates.
 */
interface IFastMultiFeedAdapter is IMultiFeedAdapter {
  /// @notice Price data structure containing price and timestamps
  /// @dev This struct occupies 1 storage slot (32 bytes), which is the minimum possible
  struct PriceData {
    uint64 price;
    uint64 priceTimestamp; // in microseconds
    uint64 blockTimestamp; // in microseconds
  }

  /// @notice Input structure for price updates
  struct PriceUpdateInput { bytes32 dataFeedId; uint64 price; }

  /// @notice Event emitted when a new round is created
  event RoundCreated(uint256 value, uint256 valueTimestamp, bytes32 dataFeedId, uint256 createdAt, uint256 roundId, uint256 updaterId);

  /// @notice Error thrown when caller is not an authorized updater
  error UpdaterNotAuthorised(address updater);
  /// @notice Error thrown when last update details are invalid or outdated
  error InvalidLastUpdateDetails(bytes32 dataFeedId, uint256 lastDataTimestamp, uint256 lastBlockTimestamp, uint256 lastValue);
  /// @notice Error thrown when requested roundId is zero
  error RoundIdIsZero(bytes32 dataFeedId);
  /// @notice Error thrown when requested roundId is too high
  error RoundIdTooHigh(bytes32 dataFeedId, uint256 roundId, uint256 latestRoundId);
  /// @notice Error thrown when requested roundId is no longer available
  error RoundIdTooOld(bytes32 dataFeedId, uint256 roundId);

  /// @notice Updates price values for multiple data feeds
  /// @param priceTimestamp The timestamp of prices in microseconds
  /// @param inputs Array of price update inputs
  function updateDataFeedsValues(uint64 priceTimestamp, PriceUpdateInput[] calldata inputs) external;

  /// @notice Returns the latest round ID for a given data feed
  /// @param dataFeedId The data feed identifier
  function getLatestRoundId(bytes32 dataFeedId) external view returns (uint256 latestRoundId);

  /// @notice Returns price data for a specific round of a data feed
  /// @param dataFeedId The data feed identifier
  /// @param roundId The round identifier
  function getRoundData(bytes32 dataFeedId, uint256 roundId) external view returns (PriceData memory);
}
