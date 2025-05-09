// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../../mocks/RedstoneConsumerNumericMock.sol";

contract Benchmark is RedstoneConsumerNumericMock {
  // We use this storage variable to avoid annoying compilation
  // warnings about function state mutability
  uint256 someStorageVar = 0;
  uint8 uniqueSignersThreshold = 1;

  function getUniqueSignersThreshold() public view override returns (uint8) {
    return uniqueSignersThreshold;
  }

  function updateUniqueSignersThreshold(uint8 newUniqueSignersThreshold) external {
    uniqueSignersThreshold = newUniqueSignersThreshold;
  }

  function extractOracleValues(bytes32[] calldata dataFeedIds) external {
    uint256[] memory values = getOracleNumericValuesFromTxMsg(dataFeedIds);
    values;
    someStorageVar = 0;
  }

  // `emptyExtractOracleValues` is used to calculate gas costs for pure
  // calling the function and calculate the exact gas costs for getting
  // the oracle values
  function emptyExtractOracleValues(bytes32[] calldata dataFeedIds) external {
    dataFeedIds;
    uint256[] memory values;
    values;
    someStorageVar = 0;
  }

  function getAuthorisedMockSignerIndex(address _signerAddress)
    public
    view
    override
    returns (uint8)
  {
    return getAllMockAuthorised(_signerAddress);
  }
}
