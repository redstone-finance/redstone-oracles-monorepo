// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;
import {IPriceFeed} from "../interfaces/IPriceFeed.sol";
import {IFastMultiFeedAdapter} from "./IFastMultiFeedAdapter.sol";

/// Price feed for FastMultiFeedAdapter
abstract contract FastPriceFeed is IPriceFeed {
  // Returns the price feed adapter contract used by this feed
  function getPriceFeedAdapter() public view virtual returns (IFastMultiFeedAdapter);
  // Returns the data feed identifier used by this feed
  function getDataFeedId() public view virtual override returns (bytes32);
  // Returns the number of decimals used for the price feed (fixed at 8)
  function decimals() public pure virtual override returns (uint8) { return 8; }
  // Returns the version of this price feed contract
  function version() public pure virtual override returns (uint256) { return 1; }

  // Returns the latest round id available from the adapter
  function latestRound() public view override returns (uint80) {
    return uint80(getPriceFeedAdapter().getLatestRoundId(getDataFeedId()));
  }

  // Returns the latest price answer from the adapter
  function latestAnswer() public view override returns (int256) {
    return int256(getPriceFeedAdapter().getValueForDataFeed(getDataFeedId()));
  }

  // Returns detailed data for a specific round
  function getRoundData(uint80 _roundId) public view override returns (
    uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
  ) {
    IFastMultiFeedAdapter.PriceData memory data = getPriceFeedAdapter().getRoundData(getDataFeedId(), _roundId);
    return (_roundId, int256(uint256(data.price)), uint256(data.priceTimestamp), uint256(data.priceTimestamp), _roundId);
  }

  // Returns detailed data for the latest round
  function latestRoundData() public view override returns (
    uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
  ) {
    return getRoundData(latestRound());
  }
}
