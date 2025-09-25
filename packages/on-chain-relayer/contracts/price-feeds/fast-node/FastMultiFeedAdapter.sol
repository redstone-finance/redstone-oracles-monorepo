// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {IFastMultiFeedAdapter} from "./IFastMultiFeedAdapter.sol";

/**
 * Contract designed for frequent price updates
 * Key assumptions:
 * - Price updates can be performed by 5 independent updaters, whose addresses are stored in the contract.
 * - The contract supports updating multiple prices simultaneously.
 * - The contract stores the latest price for each feed and each updater.
 * - The contract supports round functionality, meaning it stores historical price data.
 * - Aggregation & round creation (executed after each successful update):
 *   - The median is calculated from fresh prices (not exceeding MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS) from all updaters
 *   - For a new round to be created, 3 fresh prices from updaters are required
 */
abstract contract FastMultiFeedAdapter is IFastMultiFeedAdapter {
  // ----------------------- Config ----------------------------------------- //
  uint256 internal constant NUM_UPDATERS = 5;
  // Max number of rounds stored (ring buffer size)
  uint256 internal constant MAX_HISTORY_SIZE = 300_000_000;
  // Maximum allowed staleness of data during reading in microseconds (30 minutes)
  uint256 internal constant MAX_READING_DATA_STALENESS = 1_800_000_000;
  // Maximum allowed price data staleness in microseconds (10 seconds)
  uint64 internal constant MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS = 10_000_000;
  // Maximum allowed future offset for price timestamp in microseconds (1 second)
  uint64 internal constant MAX_DATA_TIMESTAMP_AHEAD_MICROSECONDS = 1_000_000;

  function getMaxHistorySize() internal pure virtual returns (uint256) { return MAX_HISTORY_SIZE; }
  function getMaxReadingDataStaleness() internal pure virtual returns (uint256) { return MAX_READING_DATA_STALENESS; }
  function getMaxDataTimestampDelayMicroseconds() internal pure virtual returns (uint64) { return MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS; }
  function getMaxDataTimestampAheadMicroseconds() internal pure virtual returns (uint64) { return MAX_DATA_TIMESTAMP_AHEAD_MICROSECONDS; }

  // ----------------------- Events and error ------------------------------- //
  // Round not created reasons
  event RoundNotCreatedDueToInsufficientFreshPrices(bytes32 indexed dataFeedId, uint256 freshCount);

  error UnsupportedFunctionCall(string message);
  error InvalidMedianCount(uint256 count);

  // ----------------------- Storage ---------------------------------------- //
  bytes32 private constant UPDATER_LAST_PRICE_DATA_POSITION = keccak256("fast.multi.feed.adapter.updater.last.price.data");
  bytes32 private constant LATEST_ROUND_ID_FOR_FEED_POSITION = keccak256("fast.multi.feed.adapter.latest.round.id.for.feed");
  bytes32 private constant ROUNDS_DATA_POSITION = keccak256("fast.multi.feed.adapter.rounds.data");

  // Returns the last price update data for a given updater id and data feed id
  function updaterLastPriceData() private pure returns (mapping(uint256 => mapping(bytes32 => PriceData)) storage store) {
    bytes32 position = UPDATER_LAST_PRICE_DATA_POSITION;
    assembly { store.slot := position }
  }
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

  // ----------------------- Updating prices ----------------------------- //

  /// Updates multiple data feeds values, called by authorized updaters only
  /// @param priceTimestamp The timestamp of prices in microseconds
  /// @param inputs Array of price updates containing feed ids and prices
  function updateDataFeedsValues(uint64 priceTimestamp, PriceUpdateInput[] calldata inputs) public virtual {
    uint256 updaterId = getAuthorisedUpdaterId();
    uint64 currentBlockTimestamp = getBlockTimestampInMicroSeconds();
    mapping(bytes32 => PriceData) storage updaterData = updaterLastPriceData()[updaterId];

    for (uint256 i = 0; i < inputs.length; ) {
      PriceUpdateInput calldata input = inputs[i];

      PriceData memory priceData = PriceData({
        price: input.price,
        priceTimestamp: priceTimestamp,
        blockTimestamp: currentBlockTimestamp
      });

      // Validate price data before storing
      if (validatePriceDataValid(updaterId, input.dataFeedId, priceData)) {
        updaterData[input.dataFeedId] = priceData;
        tryAggregateAndStore(input.dataFeedId, currentBlockTimestamp);
      }
      unchecked { i++; }
    }
  }

  /// @dev Returns the current block timestamp in microseconds.
  /// This method can be overridden by inheriting contracts.
  /// Overriding implementations should aim to provide the most granular timestamp available
  /// for the specific blockchain, e.g., a mini-block timestamp for MegaETH.
  function getBlockTimestampInMicroSeconds() internal view virtual returns (uint64) {
    return uint64(block.timestamp * 1_000_000);
  }

  /// Checks if caller is an authorized updater
  /// @dev Returns the ID of the authorised updater.
  /// Reverts with `UpdaterNotAuthorised(msg.sender)` if sender is not in the authorised updater list.
  /// Must be implemented in the derived contract
  function getAuthorisedUpdaterId() internal view virtual returns (uint256);

  /// Validates price data
  function validatePriceDataValid(uint256 updaterId, bytes32 feedId, PriceData memory priceData) private returns (bool) {
    // Price must be greater than zero
    if (priceData.price == 0) {
      emit UpdateSkipDueToInvalidValue(feedId);
      return false;
    }
    // Reject if price timestamp is too old relative to the block timestamp
    if (priceData.priceTimestamp + getMaxDataTimestampDelayMicroseconds() < priceData.blockTimestamp) {
      emit UpdateSkipDueToDataTimestamp(feedId);
      return false;
    }
    // Reject if price timestamp is too far in the future relative to the block timestamp
    if (priceData.priceTimestamp > priceData.blockTimestamp + getMaxDataTimestampAheadMicroseconds()) {
      emit UpdateSkipDueToDataTimestamp(feedId);
      return false;
    }
    // Price and block timestamps must be greater than before
    PriceData storage lastPriceData = updaterLastPriceData()[updaterId][feedId];
    if (priceData.priceTimestamp <= lastPriceData.priceTimestamp) {
      emit UpdateSkipDueToDataTimestamp(feedId);
      return false;
    }
    if (priceData.blockTimestamp <= lastPriceData.blockTimestamp) {
      emit UpdateSkipDueToBlockTimestamp(feedId);
      return false;
    }
    return true;
  }

  /// Attempts to aggregate last prices from all authorized updaters and stores aggregated price
  /// @param dataFeedId The data feed identifier to aggregate prices for
  /// @param currentBlockTimestamp The timestamp of the current block in microseconds
  function tryAggregateAndStore(bytes32 dataFeedId, uint64 currentBlockTimestamp) private {
    uint256[NUM_UPDATERS] memory prices;
    uint256 count = 0;
    uint64 maxPriceTimestamp = 0;

    for (uint256 i = 0; i < NUM_UPDATERS; ) {
      PriceData memory p = updaterLastPriceData()[i][dataFeedId];
      if (p.price > 0 && p.priceTimestamp + getMaxDataTimestampDelayMicroseconds() >= currentBlockTimestamp) {
        prices[count] = p.price;
        if (p.priceTimestamp > maxPriceTimestamp) maxPriceTimestamp = p.priceTimestamp;
        unchecked { count++; }
      }
      unchecked { i++; }
    }

    // < 3 fresh prices -> no round
    if (count < 3) {
      emit RoundNotCreatedDueToInsufficientFreshPrices(dataFeedId, count);
      return;
    }

    uint256 medianPrice = medianOfPrices(prices, count);

    // Create round
    uint256 newRoundId = ++latestRoundIdForFeed()[dataFeedId];
    PriceData memory newRoundData = PriceData({
      // Safe cast: median of uint64 values fits in uint64
      price: uint64(medianPrice),
      priceTimestamp: maxPriceTimestamp,
      blockTimestamp: currentBlockTimestamp
    });
    roundsData()[dataFeedId][newRoundId % getMaxHistorySize()] = newRoundData;
    emit RoundCreated(medianPrice, dataFeedId, currentBlockTimestamp, newRoundId);
  }

  /// @notice Returns median for the first `count` entries of `prices`.
  /// @dev Uses fixed-size sorting networks for count=3/4/5 to save gas; falls back to insertion sort otherwise.
  function medianOfPrices(uint256[NUM_UPDATERS] memory prices, uint256 count) internal pure returns (uint256) {
    if (count == 3) {
      return _median3(prices[0], prices[1], prices[2]);
    }
    if (count == 4) {
      return _median4(prices[0], prices[1], prices[2], prices[3]);
    }
    if (count == 5) {
      return _median5(prices[0], prices[1], prices[2], prices[3], prices[4]);
    }
    // Any other count is not expected given NUM_UPDATERS=5 and the aggregation rules.
    revert InvalidMedianCount(count);
  }

  /// @dev Median of 3 using a tiny sorting network (3 comparisons).
  function _median3(uint256 a, uint256 b, uint256 c) private pure returns (uint256) {
    (a, b) = compareAndSwap(a, b);
    (b, c) = compareAndSwap(b, c);
    (a, b) = compareAndSwap(a, b);
    return b;
  }

  /// @dev Median of 4: sort network to get middle two, then average (5 comparisons).
  function _median4(uint256 a, uint256 b, uint256 c, uint256 d) private pure returns (uint256) {
    (a, b) = compareAndSwap(a, b);
    (c, d) = compareAndSwap(c, d);
    (a, c) = compareAndSwap(a, c);
    (b, d) = compareAndSwap(b, d);
    (b, c) = compareAndSwap(b, c);
    // Safe: sum of two uint64 values fits in uint256; result fits in uint64 when cast by caller.
    return (b + c) / 2;
  }

  /// @dev Median of 5 via sorting network that places the median at position 3. Sequence of 9 compare and swaps.
  function _median5(uint256 a, uint256 b, uint256 c, uint256 d, uint256 e) private pure returns (uint256) {
    (a, b) = compareAndSwap(a, b);
    (d, e) = compareAndSwap(d, e);
    (c, e) = compareAndSwap(c, e);
    (c, d) = compareAndSwap(c, d);
    (b, e) = compareAndSwap(b, e);
    (a, d) = compareAndSwap(a, d);
    (b, c) = compareAndSwap(b, c);
    (a, b) = compareAndSwap(a, b);
    (c, d) = compareAndSwap(c, d);
    return c;
  }

  /// @dev returns (min(a,b), max(a,b)).
  function compareAndSwap(uint256 a, uint256 b) private pure returns (uint256, uint256) {
    if (a > b) return (b, a);
    return (a, b);
  }

  /// Returns last price data submitted by given updater for a feed
  /// @param updaterId Updater identifier [0 .. NUM_UPDATERS-1]
  /// @param dataFeedId Data feed identifier
  /// @return PriceData Last price data for the updater and feed
  function getUpdaterLastPriceData(uint256 updaterId, bytes32 dataFeedId) external view returns (PriceData memory) {
    return updaterLastPriceData()[updaterId][dataFeedId];
  }

  // -------------------- IMultiFeedAdapter Interface -------------------- //

  /// Function intentionally disabled to avoid misuse, directs users to use proper update method
  function updateDataFeedsValuesPartial(bytes32[] memory) external pure override {
    revert UnsupportedFunctionCall("Use the function updateDataFeedsValues(uint64,PriceUpdateInput[]) instead.");
  }

  /// Returns details about last update for a data feed; reverts if data is stale
  function getLastUpdateDetails(bytes32 dataFeedId) public view override returns (uint256 lastDataTimestamp, uint256 lastBlockTimestamp, uint256 lastValue) {
    (lastDataTimestamp, lastBlockTimestamp, lastValue) = getLastUpdateDetailsUnsafe(dataFeedId);
    if (lastBlockTimestamp + getMaxReadingDataStaleness() < getBlockTimestampInMicroSeconds()
        || lastValue == 0
        || lastDataTimestamp + getMaxDataTimestampDelayMicroseconds() < lastBlockTimestamp
        || lastDataTimestamp > lastBlockTimestamp + getMaxDataTimestampAheadMicroseconds()) {
      revert InvalidLastUpdateDetails(dataFeedId, lastDataTimestamp, lastBlockTimestamp, lastValue);
    }
  }

  /// Unsafe version of getting last update details that does not revert on stale data
  function getLastUpdateDetailsUnsafe(bytes32 dataFeedId) public view override returns (uint256 lastDataTimestamp, uint256 lastBlockTimestamp, uint256 lastValue) {
    uint256 roundId = latestRoundIdForFeed()[dataFeedId];
    PriceData memory data = roundsData()[dataFeedId][roundId % getMaxHistorySize()];
    return (data.priceTimestamp, data.blockTimestamp, data.price);
  }

  /// Returns prices for multiple data feeds
  function getValuesForDataFeeds(bytes32[] memory requestedDataFeedIds) public view override returns (uint256[] memory values) {
    values = new uint256[](requestedDataFeedIds.length);
    for (uint256 i = 0; i < requestedDataFeedIds.length; ) {
      values[i] = getValueForDataFeed(requestedDataFeedIds[i]);
      unchecked { i++; }
    }
  }

  /// Returns the latest price for a specific data feed
  function getValueForDataFeed(bytes32 dataFeedId) public view override returns (uint256 dataFeedValue) {
    return (roundsData()[dataFeedId][latestRoundIdForFeed()[dataFeedId] % getMaxHistorySize()]).price;
  }

  /// Returns the timestamp of the latest price update for a feed
  function getDataTimestampFromLatestUpdate(bytes32 dataFeedId) public view override returns (uint256 lastDataTimestamp) {
    return roundsData()[dataFeedId][latestRoundIdForFeed()[dataFeedId] % getMaxHistorySize()].priceTimestamp;
  }

  /// Returns the block timestamp of the latest price update for a feed
  function getBlockTimestampFromLatestUpdate(bytes32 dataFeedId) public view override returns (uint256 blockTimestamp) {
    return roundsData()[dataFeedId][latestRoundIdForFeed()[dataFeedId] % getMaxHistorySize()].blockTimestamp;
  }

  // -------------------------- Rounds data ------------------------------ //

  /// Returns the latest round id for a given data feed
  function getLatestRoundId(bytes32 dataFeedId) external view override returns (uint256 latestRoundId) {
    return latestRoundIdForFeed()[dataFeedId];
  }

  /// Returns price data for a specific round id, reverts if roundId is invalid
  function getRoundData(bytes32 dataFeedId, uint256 roundId) public view override returns (PriceData memory) {
    if (roundId == 0) revert RoundIdIsZero(dataFeedId);
    uint256 latestRoundId = latestRoundIdForFeed()[dataFeedId];
    if (roundId > latestRoundId) revert RoundIdTooHigh(dataFeedId, roundId, latestRoundId);
    uint256 maxHistorySize = getMaxHistorySize();
    if (roundId + maxHistorySize <= latestRoundId) revert RoundIdTooOld(dataFeedId, roundId);
    return roundsData()[dataFeedId][roundId % maxHistorySize];
  }
}
