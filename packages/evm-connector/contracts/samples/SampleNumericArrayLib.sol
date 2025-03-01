// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../libs/NumericArrayLib.sol";

contract SampleNumericArrayLib {
  uint256[] cachedArray;
  uint256 public cachedMedian;

  function testSortTx(uint256[] memory arr) public {
    NumericArrayLib.sort(arr);
    cachedArray = arr;
  }

  // Can be used to compare gas costs with the `testSortTx` function
  function testArrayUpdatingInStorage(uint256[] memory arr) public {
    cachedArray = arr;
  }

  function getCachedArray() public view returns (uint256[] memory) {
    return cachedArray;
  }

  function testMedianSelection(uint256[] memory arr) public {
    cachedMedian = NumericArrayLib.pickMedian(arr);
  }
}
