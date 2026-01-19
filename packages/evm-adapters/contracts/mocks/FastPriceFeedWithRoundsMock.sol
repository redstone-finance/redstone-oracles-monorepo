// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import "../price-feeds/fast-node/FastPriceFeedWithRounds.sol";
import "../price-feeds/fast-node/IFastMultiFeedAdapterWithRounds.sol";

contract FastPriceFeedWithRoundsMock is FastPriceFeedWithRounds {
  IFastMultiFeedAdapterWithRounds public adapter;
  bytes32 public feedId;

  constructor(IFastMultiFeedAdapterWithRounds _adapter, bytes32 _feedId) {
    adapter = _adapter;
    feedId = _feedId;
  }

  function getPriceFeedAdapter()
    public
    view
    override
    returns (IFastMultiFeedAdapterWithRounds)
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
