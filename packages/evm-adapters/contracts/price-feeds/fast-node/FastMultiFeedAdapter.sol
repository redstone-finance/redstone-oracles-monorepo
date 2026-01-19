// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {IFastMultiFeedAdapter} from "./IFastMultiFeedAdapter.sol";

/**
 * Base contract designed for frequent price updates.
 * Shared logic between adapters with and without rounds.
 * Key assumptions:
 * - Price updates can be performed by 5 independent updaters, whose addresses are stored in the contract.
 * - The contract supports updating multiple prices simultaneously.
 * - The contract stores the latest price for each feed and each updater.
 * - Aggregation (executed after each successful update):
 *   - The median is calculated from fresh prices (not exceeding MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS) from all updaters
 *   - For a aggregated price to be stored, 3 fresh prices from updaters are required
 */
abstract contract FastMultiFeedAdapter is IFastMultiFeedAdapter {
  // ----------------------- Config ----------------------------------------- //
  uint256 internal constant NUM_UPDATERS = 5;
  // Maximum allowed staleness of data during reading in microseconds (30 minutes)
  uint256 internal constant MAX_READING_DATA_STALENESS = 1_800_000_000;
  // Maximum allowed price data staleness in microseconds (10 seconds)
  uint64 internal constant MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS = 10_000_000;
  // Maximum allowed future offset for price timestamp in microseconds (1 second)
  uint64 internal constant MAX_DATA_TIMESTAMP_AHEAD_MICROSECONDS = 1_000_000;

  function getMaxReadingDataStaleness() internal pure virtual returns (uint256) { return MAX_READING_DATA_STALENESS; }
  function getMaxDataTimestampDelayMicroseconds() internal pure virtual returns (uint64) { return MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS; }
  function getMaxDataTimestampAheadMicroseconds() internal pure virtual returns (uint64) { return MAX_DATA_TIMESTAMP_AHEAD_MICROSECONDS; }

  // ----------------------- Events and errors ------------------------------ //
  /// @notice Emitted when a round cannot be created because there are fewer than 3 fresh prices.
  event RoundNotCreatedDueToInsufficientFreshPrices(bytes32 indexed dataFeedId, uint256 freshCount);

  /// @notice Revert on unsupported function call paths.
  error UnsupportedFunctionCall(string message);

  /// @notice Revert when an unexpected count is used for median calculation.
  error InvalidMedianCount(uint256 count);

  // ----------------------- Storage ---------------------------------------- //
  bytes32 private constant UPDATER_LAST_PRICE_DATA_POSITION = keccak256("fast.multi.feed.adapter.updater.last.price.data");

  // Returns the last price update data for a given updater id and data feed id
  function updaterLastPriceData() private pure returns (mapping(uint256 => mapping(bytes32 => PriceData)) storage store) {
    bytes32 position = UPDATER_LAST_PRICE_DATA_POSITION;
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
        tryAggregateAndStore(input.dataFeedId, currentBlockTimestamp, updaterId);
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

  /// @notice Checks that the caller is an authorized updater.
  /// @dev Must return the updater's numeric ID [0..NUM_UPDATERS-1].
  /// MUST revert with `UpdaterNotAuthorised(msg.sender)` if the sender is not authorized.
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
  /// @param updaterId The updater id whose successful update triggered this attempt.
  function tryAggregateAndStore(bytes32 dataFeedId, uint64 currentBlockTimestamp, uint256 updaterId) private {
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

    // < 3 fresh prices -> no aggregation
    if (count < 3) {
      emit RoundNotCreatedDueToInsufficientFreshPrices(dataFeedId, count);
      return;
    }

    uint256 medianPrice = medianOfPrices(prices, count);

    PriceData memory newPriceData = PriceData({
      // Safe cast: median of uint64 values fits in uint64
      price: uint64(medianPrice),
      priceTimestamp: maxPriceTimestamp,
      blockTimestamp: currentBlockTimestamp
    });
    storeAggregatedPrice(dataFeedId, newPriceData, medianPrice, updaterId);
  }

  /// @notice Stores aggregated price data
  /// @dev to be implemented by inheriting contracts
  function storeAggregatedPrice(bytes32 dataFeedId, PriceData memory newPriceData, uint256 medianPrice, uint256 updaterId) internal virtual;

  /// @notice Returns median for the first `count` entries of `prices`.
  /// @dev Uses fixed-size sorting networks for count=3/4/5 to save gas; reverts otherwise.
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

  /// @dev Median of 4 using 4 comparisons (no full sort).
  function _median4(uint256 a, uint256 b, uint256 c, uint256 d) private pure returns (uint256) {
    (a, b) = compareAndSwap(a, b);
    (c, d) = compareAndSwap(c, d);
    (a, c) = compareAndSwap(a, c);
    (b, d) = compareAndSwap(b, d);
    // Safe: sum of two uint64 values fits in uint256; result fits in uint64 when cast by caller.
    return (b + c) / 2;
  }

  /// @dev Median of 5 using a 7-comparison selection network.
  function _median5(uint256 a, uint256 b, uint256 c, uint256 d, uint256 e) private pure returns (uint256) {
    (a, b) = compareAndSwap(a, b); // a<=b
    (c, d) = compareAndSwap(c, d); // c<=d
    (a, c) = compareAndSwap(a, c); // a<=c
    (b, d) = compareAndSwap(b, d); // b<=d
    (b, c) = compareAndSwap(b, c); // b<=c  (now a <= b <= c <= d)

    if (e <= b) return b;
    if (e >= c) return c;
    return e;
  }

  /// @dev returns (min(a,b), max(a,b)).
  function compareAndSwap(uint256 a, uint256 b) private pure returns (uint256, uint256) {
    if (a > b) return (b, a);
    return (a, b);
  }

  // ------------------------ Read helpers ---------------------------------- //

  /// Returns last price data submitted by given updater for a feed
  /// @param updaterId Updater identifier [0 .. NUM_UPDATERS-1]
  /// @param dataFeedId Data feed identifier
  /// @return PriceData Last price data for the updater and feed
  function getUpdaterLastPriceData(uint256 updaterId, bytes32 dataFeedId) external view returns (PriceData memory) {
    return updaterLastPriceData()[updaterId][dataFeedId];
  }

  // -------------------- IMultiFeedAdapter Interface ------------------------ //

  /// @notice Function intentionally disabled to avoid misuse; directs users to the proper update method.
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

  /// @notice Returns latest price data for a data feed
  /// @dev to be implemented by inheriting contracts
  function getLatestPriceData(bytes32 dataFeedId) internal view virtual returns (PriceData memory);

  /// Unsafe version of getting last update details that does not revert on stale data
  function getLastUpdateDetailsUnsafe(bytes32 dataFeedId) public view override returns (uint256 lastDataTimestamp, uint256 lastBlockTimestamp, uint256 lastValue) {
    PriceData memory data = getLatestPriceData(dataFeedId);
    return (data.priceTimestamp, data.blockTimestamp, data.price);
  }

    /// @dev Returns batch stats about last updates. It's convenient to use it in monitoring tools
  function getLastUpdateDetailsUnsafeForMany(bytes32[] memory dataFeedIds) external view returns (LastUpdateDetails[] memory detailsForFeeds) {
    detailsForFeeds = new LastUpdateDetails[](dataFeedIds.length);
    for (uint256 i = 0; i < dataFeedIds.length;) {
      (detailsForFeeds[i].dataTimestamp, detailsForFeeds[i].blockTimestamp, detailsForFeeds[i].value) = getLastUpdateDetailsUnsafe(dataFeedIds[i]);
      unchecked { i++; } // reduces gas costs
    }
  }

  /// @notice Returns prices for multiple data feeds.
  function getValuesForDataFeeds(bytes32[] memory requestedDataFeedIds) public view override returns (uint256[] memory values) {
    values = new uint256[](requestedDataFeedIds.length);
    for (uint256 i = 0; i < requestedDataFeedIds.length; ) {
      values[i] = getValueForDataFeed(requestedDataFeedIds[i]);
      unchecked { i++; }
    }
  }

  /// @notice Returns the latest price for a specific data feed.
  function getValueForDataFeed(bytes32 dataFeedId) public view override returns (uint256 dataFeedValue) {
    (,, dataFeedValue) = getLastUpdateDetails(dataFeedId);
  }

  /// @notice Returns the data timestamp of the latest price update for a feed.
  function getDataTimestampFromLatestUpdate(bytes32 dataFeedId) public view override returns (uint256 lastDataTimestamp) {
    (lastDataTimestamp, ,) = getLastUpdateDetails(dataFeedId);
  }

  /// @notice Returns the block timestamp of the latest price update for a feed.
  function getBlockTimestampFromLatestUpdate(bytes32 dataFeedId) public view override returns (uint256 blockTimestamp) {
    (, blockTimestamp, ) = getLastUpdateDetails(dataFeedId);
  }
}
