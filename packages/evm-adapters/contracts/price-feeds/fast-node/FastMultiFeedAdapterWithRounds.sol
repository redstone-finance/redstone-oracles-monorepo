// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {FastMultiFeedAdapter} from "./FastMultiFeedAdapter.sol";
import {IFastMultiFeedAdapterWithRounds} from "./IFastMultiFeedAdapterWithRounds.sol";

/**
 * Contract designed for frequent price updates with round history.
 */
abstract contract FastMultiFeedAdapterWithRounds is FastMultiFeedAdapter, IFastMultiFeedAdapterWithRounds {
  // ----------------------- Config ----------------------------------------- //
  // Max number of rounds stored (ring buffer size)
  uint256 internal constant MAX_HISTORY_SIZE = 1_000_000;

  function getMaxHistorySize() internal pure virtual returns (uint256) { return MAX_HISTORY_SIZE; }

  // ----------------------- Storage ---------------------------------------- //
  bytes32 private constant LATEST_ROUND_ID_FOR_FEED_POSITION = keccak256("fast.multi.feed.adapter.latest.round.id.for.feed");
  bytes32 private constant ROUNDS_DATA_POSITION = keccak256("fast.multi.feed.adapter.rounds.data");

  // Returns the last round id for a given data feed id
  function latestRoundIdForFeed() private pure returns (mapping(bytes32 => uint256) storage store) {
    bytes32 position = LATEST_ROUND_ID_FOR_FEED_POSITION;
    assembly { store.slot := position }
  }
  // Returns round data for a given data feed id and round id
  function roundsData() private pure returns (mapping(bytes32 => mapping(uint256 => PriceData)) storage store) {
    bytes32 position = ROUNDS_DATA_POSITION;
    assembly { store.slot := position }
  }

  function storeAggregatedPrice(bytes32 dataFeedId, PriceData memory newPriceData, uint256 medianPrice, uint256 updaterId) internal virtual override {
    uint256 newRoundId = ++latestRoundIdForFeed()[dataFeedId];
    roundsData()[dataFeedId][newRoundId % getMaxHistorySize()] = newPriceData;
    emit RoundCreated(medianPrice, newPriceData.priceTimestamp, dataFeedId, newPriceData.blockTimestamp, newRoundId, updaterId);
  }

  function getLatestPriceData(bytes32 dataFeedId) internal view virtual override returns (PriceData memory) {
    uint256 roundId = latestRoundIdForFeed()[dataFeedId];
    return roundsData()[dataFeedId][roundId % getMaxHistorySize()];
  }

  // -------------------------- Rounds data --------------------------------- //

  /// @notice Returns the latest round id for a given data feed.
  function getLatestRoundId(bytes32 dataFeedId) external view override returns (uint256 latestRoundId) {
    return latestRoundIdForFeed()[dataFeedId];
  }

  /// @notice Returns price data for a specific round id; reverts if roundId is invalid or unavailable.
  function getRoundData(bytes32 dataFeedId, uint256 roundId) public view override returns (PriceData memory) {
    if (roundId == 0) revert RoundIdIsZero(dataFeedId);
    uint256 latestRoundId = latestRoundIdForFeed()[dataFeedId];
    if (roundId > latestRoundId) revert RoundIdTooHigh(dataFeedId, roundId, latestRoundId);
    uint256 maxHistorySize = getMaxHistorySize();
    if (roundId + maxHistorySize <= latestRoundId) revert RoundIdTooOld(dataFeedId, roundId);
    return roundsData()[dataFeedId][roundId % maxHistorySize];
  }
}
