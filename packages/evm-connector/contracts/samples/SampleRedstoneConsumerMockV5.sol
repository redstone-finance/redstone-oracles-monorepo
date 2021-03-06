// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "../mocks/RedstoneConsumerMockV5.sol";
import "../commons/NumericArrayLib.sol";
import "hardhat/console.sol";

contract SampleRedstoneConsumerMockV5 is RedstoneConsumerMockV5 {
  uint256 constant BITS_COUNT_IN_ONE_BYTE = 8;

  uint256 public latestPrice;

  function aggregateByteValues(uint256[] memory calldataPointersForValues)
    public
    pure
    override
    returns (bytes memory)
  {
    uint256[] memory numericValues = new uint256[](calldataPointersForValues.length);
    for (uint256 i = 0; i < calldataPointersForValues.length; i++) {
      bytes calldata bytesValue = getCalldataBytesFromCalldataPointer(
        calldataPointersForValues[i]
      );
      numericValues[i] = calldataBytesToUint256(bytesValue);
    }

    uint256 numericAggregatedResult = NumericArrayLib.pickMedian(numericValues);
    bytes memory aggregatedResult = abi.encodePacked(numericAggregatedResult);

    // convert uint256 to bytes
    return aggregatedResult;
  }

  function getPriceSecurely(bytes32 symbol) public view returns (uint256) {
    bytes memory bytesValueFromOracle = getOracleBytesValueFromTxMsg(symbol);
    return bytesToUint256(bytesValueFromOracle);
  }

  function saveLatestPriceInStorage(bytes32 symbol) public {
    bytes memory bytesValueFromOracle = getOracleBytesValueFromTxMsg(symbol);
    latestPrice = bytesToUint256(bytesValueFromOracle);
  }

  function calldataBytesToUint256(bytes calldata bytesValue)
    private
    pure
    returns (uint256 uintValue)
  {
    assembly {
      let byteSize := bytesValue.length
      let bitSize := mul(byteSize, BITS_COUNT_IN_ONE_BYTE)

      uintValue := shr(sub(256, bitSize), calldataload(bytesValue.offset))
    }
  }

  function bytesToUint256(bytes memory bytesValue)
    private
    pure
    returns (uint256 uintValue)
  {
    assembly {
      let byteSize := mload(bytesValue)
      let bitSize := mul(byteSize, BITS_COUNT_IN_ONE_BYTE)

      uintValue := shr(sub(256, bitSize), mload(add(bytesValue, BYTES_ARR_LEN_VAR_BS)))
    }
  }
}
