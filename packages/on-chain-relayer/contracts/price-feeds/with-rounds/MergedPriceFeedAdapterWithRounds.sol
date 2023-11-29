// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.14;

import {PriceFeedBase, PriceFeedWithRounds} from "./PriceFeedWithRounds.sol";
import {PriceFeedsAdapterBase, PriceFeedsAdapterWithRounds} from "./PriceFeedsAdapterWithRounds.sol";
import {IRedstoneAdapter} from "../../core/IRedstoneAdapter.sol";
import {MergedPriceFeedAdapterCommon} from "../MergedPriceFeedAdapterCommon.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

abstract contract MergedPriceFeedAdapterWithRounds is
  MergedPriceFeedAdapterCommon,
  PriceFeedWithRounds,
  PriceFeedsAdapterWithRounds
{
  function initialize() public override(PriceFeedBase, PriceFeedsAdapterBase) initializer {
    // We don't have storage variables, but we keep this function
    // Because it is used for contract setup in upgradable contracts
  }

  function getPriceFeedAdapter() public view virtual override(MergedPriceFeedAdapterCommon, PriceFeedBase) returns (IRedstoneAdapter) {
    return super.getPriceFeedAdapter();
  }

  function getDataFeedIds() public view virtual override returns (bytes32[] memory dataFeedIds) {
    dataFeedIds = new bytes32[](1);
    dataFeedIds[0] = getDataFeedId();
  }

  function getDataFeedIndex(bytes32 dataFeedId) public view virtual override returns (uint256) {
    if (dataFeedId == getDataFeedId()) {
      return 0;
    } else {
      revert DataFeedIdNotFound(dataFeedId);
    }
  }

  function _emitEventAfterSingleValueUpdate(uint256 newValue) internal virtual {
    emit AnswerUpdated(SafeCast.toInt256(newValue), getLatestRoundId(), block.timestamp);
  }

  function _validateAndUpdateDataFeedsValues(
    bytes32[] memory dataFeedIdsArray,
    uint256[] memory values
  ) internal virtual override {
    if (dataFeedIdsArray.length != 1 || values.length != 1) {
      revert CannotUpdateMoreThanOneDataFeed();
    }
    PriceFeedsAdapterWithRounds._validateAndUpdateDataFeedsValues(dataFeedIdsArray, values);
    _emitEventAfterSingleValueUpdate(values[0]);
  }
}
