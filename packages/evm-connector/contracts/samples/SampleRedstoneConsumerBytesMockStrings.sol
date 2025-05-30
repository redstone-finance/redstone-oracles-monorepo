// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../mocks/RedstoneConsumerBytesMock.sol";
import "../libs/NumericArrayLib.sol";

contract SampleRedstoneConsumerBytesMockStrings is RedstoneConsumerBytesMock {
  bytes public latestString;

  function saveLatestValueInStorage(bytes32 dataFeedId) public {
    bytes memory bytesValueFromOracle = getOracleBytesValueFromTxMsg(dataFeedId);
    latestString = bytesValueFromOracle;
  }
}
