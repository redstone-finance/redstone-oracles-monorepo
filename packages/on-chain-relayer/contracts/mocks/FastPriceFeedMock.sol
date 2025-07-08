// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import "../price-feeds/fast-node/FastPriceFeed.sol";

contract FastPriceFeedMock is FastPriceFeed {
  IFastMultiFeedAdapter public adapter;
  bytes32 public feedId;

  constructor(IFastMultiFeedAdapter _adapter, bytes32 _feedId) {
    adapter = _adapter;
    feedId = _feedId;
  }

  function getPriceFeedAdapter()
    public
    view
    override
    returns (IFastMultiFeedAdapter)
  {
    return adapter;
  }

  function getDataFeedId() public view override returns (bytes32) {
    return feedId;
  }

  function description() external pure override returns (string memory) {
    return "A mock contract for testing FastPriceFeed";
  }
}
