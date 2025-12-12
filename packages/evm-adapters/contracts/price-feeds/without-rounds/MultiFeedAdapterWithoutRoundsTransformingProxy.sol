// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {IMultiFeedAdapter} from "../interfaces/IMultiFeedAdapter.sol";

/**
 * @title MultiFeedAdapterWithoutRoundsTransformingProxy
 * @author The Redstone Oracles team
 * @dev Proxy contrract that can be used to transform response from an original adapter, e.g. to unify timestamp formats on MegaETH
 */
abstract contract MultiFeedAdapterWithoutRoundsTransformingProxy is IMultiFeedAdapter {
  error UnsupportedFunctionCall();

  /// @dev This function must be overriden in the contract with configuration
  function getOriginalAdapter() public view virtual returns (IMultiFeedAdapter);

  /// @dev This function must be overriden in the contract with configuration. It should specify the logic of transformation
  function _transformLastUpdateDetails(uint256 dataTs, uint256 blockTs, uint256 value) internal view virtual returns (
    uint256 lastDataTimestamp,
    uint256 lastBlockTimestamp,
    uint256 lastValue
  );

  function getLastUpdateDetails(bytes32 dataFeedId) public view returns (
    uint256 lastDataTimestamp,
    uint256 lastBlockTimestamp,
    uint256 lastValue
  ) {
    (uint256 dataTs, uint256 blockTs, uint256 value) = getOriginalAdapter().getLastUpdateDetails(dataFeedId);
    return _transformLastUpdateDetails(dataTs, blockTs, value);
  }

  /// @dev We need to override this function, because it's used in latestAnswer function in the PriceFeedBase contract
  function getValueForDataFeed(bytes32 dataFeedId) public view returns (uint256) {
    (/* dataTs */, /* blockTs */, uint256 lastValue) = getLastUpdateDetails(dataFeedId);
    return lastValue;
  }

  function updateDataFeedsValuesPartial(bytes32[] memory) external pure override {
    revert UnsupportedFunctionCall();
  }
  function getLastUpdateDetailsUnsafe(bytes32) external pure override returns (uint256, uint256, uint256) {
    revert UnsupportedFunctionCall();
  }
  function getValuesForDataFeeds(bytes32[] memory) external pure override returns (uint256[] memory) {
    revert UnsupportedFunctionCall();
  }
  function getDataTimestampFromLatestUpdate(bytes32) external pure override returns (uint256) {
    revert UnsupportedFunctionCall();
  }
  function getBlockTimestampFromLatestUpdate(bytes32) external pure override returns (uint256) {
    revert UnsupportedFunctionCall();
  }
}
