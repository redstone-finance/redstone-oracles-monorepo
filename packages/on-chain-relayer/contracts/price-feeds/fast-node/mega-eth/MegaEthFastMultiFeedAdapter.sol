// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;
import "../FastMultiFeedAdapter.sol";

/**
 * @title MegaEthFastMultiFeedAdapter
 * @notice Extends FastMultiFeedAdapter with temporary mini-block timestamp functionality
 */
contract MegaEthFastMultiFeedAdapter is FastMultiFeedAdapter {
  uint256 private miniBlockCounter; // Mini-block counter for high-resolution timestamps

  function updateDataFeedsValues(uint64 priceTimestamp, PriceUpdateInput[] calldata inputs) public override {
    unchecked { miniBlockCounter++; }
    super.updateDataFeedsValues(priceTimestamp, inputs);
  }

  function getAuthorisedUpdaterId() internal view override returns (uint256) {
    if (msg.sender == 0xD457D7c2506f5df15aF7117474308AA407cB5BFA) return 0;
    if (msg.sender == 0xa0737532Ec7C48e5695d144fC3E3dbf54d082BCf) return 1;
    if (msg.sender == 0x08C30eDE2ddcee50CC493f77aE387674609aD7C6) return 2;
    if (msg.sender == 0x617F2E2fD72FD9D5503197092aC168c91465E7f2) return 3;
    if (msg.sender == 0x17F6AD8Ef982297579C203069C1DbfFE4348c372) return 4;
    revert UpdaterNotAuthorised(msg.sender);
  }

  /// FIXME The function should be modified once the functionality for reading mini-block timestamps becomes available in MegaETH.
  function getBlockTimestampInMicroSeconds() internal view override returns (uint64) {
    return uint64(block.timestamp * 1_000_000 + (miniBlockCounter % 1_000_000));
  }
}
