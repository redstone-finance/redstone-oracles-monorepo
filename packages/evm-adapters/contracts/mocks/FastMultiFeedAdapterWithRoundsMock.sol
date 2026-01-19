// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import "../price-feeds/fast-node/FastMultiFeedAdapterWithRounds.sol";

contract FastMultiFeedAdapterWithRoundsMock is FastMultiFeedAdapterWithRounds {
  /// @dev overridden in mock to reduce storage size for testing purposes.
  function getMaxHistorySize() internal pure override returns (uint256) {
    return 10;
  }

  /// @dev exposes the internal medianOfPrices function for testing purposes
  function _medianOfPrices(uint256[NUM_UPDATERS] memory prices, uint256 count) public pure returns (uint256) {
    return medianOfPrices(prices, count);
  }

  function getAuthorisedUpdaterId() internal view override returns (uint256) {
    if (msg.sender == 0xA13f0A8e3CbF4Cd612a5b7E4C24e376Fb0b56A11) return 0;
    if (msg.sender == 0x52c4F9885b93f11055A037CCB8fAb557D38A2234) return 1;
    if (msg.sender == 0xb724E5e8F5E8F9186f7bF6823ddb1fFE9C77b3BD) return 2;
    if (msg.sender == 0x40AE11483d9B1E7F7Ccf56aaf76AdeB8e320d07C) return 3;
    if (msg.sender == 0x92c5e1b7B1467ea836F9c3bFb8fe8297b97f95BD) return 4;
    revert UpdaterNotAuthorised(msg.sender);
  }
}
