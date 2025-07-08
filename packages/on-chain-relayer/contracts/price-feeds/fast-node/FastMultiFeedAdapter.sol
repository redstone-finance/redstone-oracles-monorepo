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
 * - After each update, a new round is calculated for the feeds that were updated.
 * - The price aggregation algorithm works by taking the latest prices for a given feed from the 5 updaters,
 *   selecting the 3 most recent ones, calculating the median of those 3,
 *   and returning either that median or the most recent price if it was close to the median.
 * - The above means that the adapter functions correctly with 3 out of 5 nodes operating properly,
 *   and with 2 out of 5 nodes operating properly, it returns correct prices accurate within the DEVIATION_THRESHOLD.
 */
abstract contract FastMultiFeedAdapter is IFastMultiFeedAdapter {
  // Threshold for price deviation in basis points (50 basis points = 0.5%)
  uint256 internal constant DEVIATION_THRESHOLD_BASIS_POINTS = 50;
  // Max number of rounds stored (at least 1 month)
  uint256 internal constant MAX_HISTORY_SIZE = 300_000_000;
  // Maximum allowed staleness of data during reading in microseconds (30 minutes)
  uint256 internal constant MAX_DATA_STALENESS = 30_000_000;
  // Maximum allowed price data staleness in microseconds (1 minute)
  uint64 internal constant MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS = 60_000_000;
  // Maximum allowed future offset for price timestamp in microseconds (1 minute)
  uint64 internal constant MAX_DATA_TIMESTAMP_AHEAD_MICROSECONDS = 60_000_000;

  function getDeviationThresholdBasisPoints() internal pure virtual returns (uint256) { return DEVIATION_THRESHOLD_BASIS_POINTS; }
  function getMaxHistorySize() internal pure virtual returns (uint256) { return MAX_HISTORY_SIZE; }

  error UnsupportedFunctionCall(string message);

  // ----------------------- Storage ---------------------------------------- //

  // Storage positions for each mapping
  bytes32 private constant UPDATER_LAST_PRICE_DATA_POSITION = keccak256("fast.multi.feed.adapter.updater.last.price.data");
  bytes32 private constant LATEST_ROUND_ID_FOR_FEED_POSITION = keccak256("fast.multi.feed.adapter.latest.round.id.for.feed");
  bytes32 private constant ROUNDS_DATA_POSITION = keccak256("fast.multi.feed.adapter.rounds.data");

  // Returns the last price update data for a given updater address and data feed id
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
  /// Reverts with UpdaterNotAuthorised(msg.sender) if sender is not in the authorised updater list.
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
    if (priceData.priceTimestamp + MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS < priceData.blockTimestamp) {
      emit UpdateSkipDueToDataTimestamp(feedId);
      return false;
    }
    // Reject if price timestamp is too far in the future relative to the block timestamp
    if (priceData.priceTimestamp > priceData.blockTimestamp + MAX_DATA_TIMESTAMP_AHEAD_MICROSECONDS) {
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
    PriceData[5] memory prices;
    for (uint256 i = 0; i < 5; ) {
      prices[i] = updaterLastPriceData()[i][dataFeedId];
      // We do not aggregate the price if any updater has not provided it yet
      if (prices[i].priceTimestamp == 0) return;
      unchecked { i++; }
    }

    // Increment round id for the feed and store aggregated price data
    uint256 newRoundId = ++latestRoundIdForFeed()[dataFeedId];
    PriceData memory newRoundData = medianOrLastOfLatestThree(prices);
    newRoundData.blockTimestamp = currentBlockTimestamp;
    roundsData()[dataFeedId][newRoundId % getMaxHistorySize()] = newRoundData;
    emit RoundCreated(newRoundData.price, dataFeedId, currentBlockTimestamp, newRoundId);
  }

  /// Finds median or latest price data based on timestamps and deviation threshold
  /// Note: This function does not specifically handle cases where more than three prices share the same timestamp,
  /// as this is considered a highly unlikely scenario.
  /// @param prices Array of last price data from authorized updaters
  function medianOrLastOfLatestThree(PriceData[5] memory prices) internal pure returns (PriceData memory) {
    // Compare two pairs
    (PriceData memory a, PriceData memory b) = prices[0].priceTimestamp > prices[1].priceTimestamp ? (prices[0], prices[1]) : (prices[1], prices[0]);
    (PriceData memory c, PriceData memory d) = prices[2].priceTimestamp > prices[3].priceTimestamp ? (prices[2], prices[3]) : (prices[3], prices[2]);

    // Merge the two pairs (a > b, c > d)
    if (a.priceTimestamp > c.priceTimestamp) {
      if (c.priceTimestamp > b.priceTimestamp) {
        if (b.priceTimestamp > d.priceTimestamp) {
          (a, b, c) = (a, c, b); // a > c > b > d
        } else {
          (a, b, c) = (a, c, d); // a > c > d > b
        }
      }
    } else {
      if (a.priceTimestamp > d.priceTimestamp) {
        if (b.priceTimestamp > d.priceTimestamp) {
          (a, b, c) = (c, a, b); // c > a > b > d
        } else {
          (a, b, c) = (c, a, d); // c > a > d > b
        }
      } else {
        (a, b, c) = (c, d, a); // c > d > a > b
      }
    }

    // Insert the 5th element to (a > b > c)
    if (prices[4].priceTimestamp > a.priceTimestamp) {
      (a, b, c) = (prices[4], a, b);
    } else if (prices[4].priceTimestamp > c.priceTimestamp) {
      (a, b, c) = (a, b, prices[4]); // We don't know which is larger, b or prices[4], but it's irrelevant
    }
    return medianOrLast(a, b, c);
  }

  function medianOrLast(PriceData memory latest, PriceData memory p1, PriceData memory p2) private pure returns (PriceData memory) {
    PriceData memory med = medianOfThreePrices(p1, p2, latest);
    return isWithinDeviation(med.price, latest.price) ? latest : med;
  }

  function medianOfThreePrices(PriceData memory p1, PriceData memory p2, PriceData memory p3) private pure returns (PriceData memory) {
    if (p1.price > p2.price) {
      return (p1.price < p3.price) ? p1 : ((p2.price > p3.price) ? p2 : p3);
    }
    return (p1.price > p3.price) ? p1 : ((p2.price > p3.price) ? p3 : p2);
  }

  /// Determines if the latest price is within deviation threshold compared to median price
  /// @param value Price to check
  /// @param base Reference price
  function isWithinDeviation(uint256 value, uint256 base) private pure returns (bool) {
    uint256 deviation = value > base ? value - base : base - value;
    return deviation * 10_000 <= base * getDeviationThresholdBasisPoints();
  }

  /// Returns last price data submitted by given updater for a feed
  /// @param updaterId Updater identifier [0 - 4]
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
    if (lastBlockTimestamp + MAX_DATA_STALENESS < getBlockTimestampInMicroSeconds() 
        || lastValue == 0 
        || lastDataTimestamp + MAX_DATA_TIMESTAMP_DELAY_MICROSECONDS < lastBlockTimestamp 
        || lastDataTimestamp > lastBlockTimestamp + MAX_DATA_TIMESTAMP_AHEAD_MICROSECONDS) {
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
    for (uint i = 0; i < requestedDataFeedIds.length; ) {
      values[i] = getValueForDataFeed(requestedDataFeedIds[i]);
      unchecked { i++; }
    }
  }

  /// Returns the latest price for a specific data feed
  function getValueForDataFeed(bytes32 dataFeedId) public view override returns (uint256 dataFeedValue) {
    return roundsData()[dataFeedId][latestRoundIdForFeed()[dataFeedId] % getMaxHistorySize()].price;
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
  function getRoundData(bytes32 dataFeedId, uint256 roundId) public view returns (PriceData memory) {
    uint256 latestRoundId = latestRoundIdForFeed()[dataFeedId];
    if (roundId == 0) revert RoundIdIsZero(dataFeedId);
    if (roundId > latestRoundId) revert RoundIdTooHigh(dataFeedId, roundId, latestRoundId);
    if (roundId + getMaxHistorySize() <= latestRoundId) revert RoundIdTooOld(dataFeedId, roundId);
    return roundsData()[dataFeedId][roundId % getMaxHistorySize()];
  }
}
