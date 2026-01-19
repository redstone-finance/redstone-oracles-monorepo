// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {IPriceFeed} from "../interfaces/IPriceFeed.sol";
import {IFastMultiFeedAdapterWithRounds} from "./IFastMultiFeedAdapterWithRounds.sol";

/// Price feed for FastMultiFeedAdapter
abstract contract FastPriceFeedWithRounds is IPriceFeed {
  uint256 internal constant INT256_MAX = uint256(type(int256).max);
  uint256 internal constant UINT80_MAX = uint256(type(uint80).max);

  error UnsafeUint256ToInt256Conversion(uint256 value);
  error UnsafeUint256ToUint80Conversion(uint256 value);

  // Returns the price feed adapter contract used by this feed
  function getPriceFeedAdapter() public view virtual returns (IFastMultiFeedAdapterWithRounds);
  // Returns the data feed identifier used by this feed
  function getDataFeedId() public view virtual override returns (bytes32);
  // Returns the number of decimals used for the price feed (fixed at 8)
  function decimals() public pure virtual override returns (uint8) { return 8; }
  // Returns the version of this price feed contract
  function version() public pure virtual override returns (uint256) { return 1; }

  // Returns the latest round id available from the adapter
  function latestRound() public view override returns (uint80) {
    uint256 latestRoundUint256 = getPriceFeedAdapter().getLatestRoundId(getDataFeedId());

    if (latestRoundUint256 > UINT80_MAX) {
      revert UnsafeUint256ToUint80Conversion(latestRoundUint256);
    }

    return uint80(latestRoundUint256);
  }

  // Returns the latest price answer from the adapter
  function latestAnswer() public view override returns (int256) {
    uint256 uintAnswer = getPriceFeedAdapter().getValueForDataFeed(getDataFeedId());

    if (uintAnswer > INT256_MAX) {
      revert UnsafeUint256ToInt256Conversion(uintAnswer);
    }

    return int256(uintAnswer);
  }

  // Returns detailed data for a specific round
  function getRoundData(uint80 _roundId) public view override returns (
    uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
  ) {
    IFastMultiFeedAdapterWithRounds.PriceData memory data = getPriceFeedAdapter().getRoundData(getDataFeedId(), _roundId);
    return (_roundId, int256(uint256(data.price)), data.blockTimestamp, data.blockTimestamp, _roundId);
  }

  // Returns detailed data for the latest round
  function latestRoundData() public view override returns (
    uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
  ) {
    return getRoundData(latestRound());
  }
}
