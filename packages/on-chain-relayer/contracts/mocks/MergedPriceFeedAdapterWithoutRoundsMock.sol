// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {AuthorisedMockSignersBase} from "@redstone-finance/evm-connector/contracts/mocks/AuthorisedMockSignersBase.sol";
import {MergedPriceFeedAdapterWithoutRounds} from "../price-feeds/without-rounds/MergedPriceFeedAdapterWithoutRounds.sol";

contract MergedPriceFeedAdapterWithoutRoundsMock is MergedPriceFeedAdapterWithoutRounds, AuthorisedMockSignersBase {
  function getUniqueSignersThreshold() public view virtual override returns (uint8) {
    return 2;
  }

  function getAuthorisedSignerIndex(address signerAddress) public view virtual override returns (uint8) {
    return getAuthorisedMockSignerIndex(signerAddress);
  }

  function getDataFeedId() public pure virtual override returns (bytes32) {
    return bytes32("BTC");
  }
}
