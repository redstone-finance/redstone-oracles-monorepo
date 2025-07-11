// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

// This struct is used only for returning values
struct LastUpdateDetails {
  uint256 dataTimestamp;
  uint256 blockTimestamp;
  uint256 value;
}

interface IStylusAdapter {
  function getUniqueSignersThreshold() view external returns (uint8);
  function writePrices(bytes32[] memory dataFeedsIds, bytes memory payload) external;
  function getLastUpdateDetailsUnsafeForMany(bytes32[] memory dataFeedIds) external view returns (LastUpdateDetails[] memory detailsForFeeds);
}
