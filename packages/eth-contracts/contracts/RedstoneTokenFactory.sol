// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.17;

import "./RedstoneToken.sol";

/**
 * @title RedstoneTokenFactory
 * @dev A simple factory for deploying redstone tokens
 */
contract RedstoneTokenFactory {
  RedstoneToken public token;

  // Deploys the redstone token and sends a new minter proposal to
  // the msg.sender, which needs to approve it using the acceptMinterRole function
  function deployTokenAndProposeNewMinter() external {
    require(address(token) == address(0), "Already deployed");
    token = new RedstoneToken(0);
    token.proposeNewMinter(msg.sender);
  }
}
