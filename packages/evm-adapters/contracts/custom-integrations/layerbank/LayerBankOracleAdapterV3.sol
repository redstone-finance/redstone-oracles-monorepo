// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {LayerBankOracleAdapterV2} from "./LayerBankOracleAdapterV2.sol";

contract LayerBankOracleAdapterV3 is LayerBankOracleAdapterV2 {
  function getDataFeedIdForAsset(address asset) public view virtual override returns (bytes32) {
    if (asset == USDC_ASSET) {
      return USDC_ID;
    } else if (asset == TIA_ASSET) {
      return TIA_ID;
    } else if (asset == WST_ETH_ASSET) {
      return WST_ETH_ID;
    } else if (asset == STONE_ASSET) {
      return STONE_ID;
    } else if (asset == MANTA_ASSET) {
      return MANTA_ID;
    } else if (asset == ETH_ASSET) {
      return ETH_ID;
    } else {
      revert UnsupportedAsset(asset);
    }
  }

  function getDataFeedIds() public view virtual override returns (bytes32[] memory dataFeedIds) {
    dataFeedIds = new bytes32[](6);
    dataFeedIds[0] = ETH_ID;
    dataFeedIds[1] = USDC_ID;
    dataFeedIds[2] = TIA_ID;
    dataFeedIds[3] = WST_ETH_ID;
    dataFeedIds[4] = STONE_ID;
    dataFeedIds[5] = MANTA_ID;
  }
}
