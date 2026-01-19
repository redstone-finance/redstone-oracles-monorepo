// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {FastMultiFeedAdapter} from "./FastMultiFeedAdapter.sol";
import {IFastMultiFeedAdapterWithoutRounds} from "./IFastMultiFeedAdapterWithoutRounds.sol";

/**
 * Contract designed for frequent price updates without round history.
 */
abstract contract FastMultiFeedAdapterWithoutRounds is FastMultiFeedAdapter, IFastMultiFeedAdapterWithoutRounds {
  // ----------------------- Storage ---------------------------------------- //
  bytes32 private constant LATEST_PRICE_DATA_POSITION = keccak256("fast.multi.feed.adapter.latest.price.data");

  function latestPriceData() private pure returns (mapping(bytes32 => PriceData) storage store) {
    bytes32 position = LATEST_PRICE_DATA_POSITION;
    assembly { store.slot := position }
  }

  function storeAggregatedPrice(bytes32 dataFeedId, PriceData memory newPriceData, uint256 medianPrice, uint256 updaterId) internal virtual override {
    latestPriceData()[dataFeedId] = newPriceData;
    emit FastValueUpdate(medianPrice, dataFeedId, newPriceData.blockTimestamp, newPriceData.priceTimestamp, updaterId);
  }

  function getLatestPriceData(bytes32 dataFeedId) internal view virtual override returns (PriceData memory) {
    return latestPriceData()[dataFeedId];
  }
}
