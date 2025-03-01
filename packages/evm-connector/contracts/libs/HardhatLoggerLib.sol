// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "hardhat/console.sol";

library HardhatLoggerLib {
  function logUint256Array(uint256[] memory arr) internal pure {
    for (uint256 i = 0; i < arr.length; i++) {
      console.log("\narr", i);
      console.log(arr[i]);
    }
  }
}
