// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {IFastMultiFeedAdapter} from "./IFastMultiFeedAdapter.sol";

/**
 * Interface for fast adapter without round history.
 */
interface IFastMultiFeedAdapterWithoutRounds is IFastMultiFeedAdapter {
  /// @notice Event emitted when a new value is stored
  event FastValueUpdate(uint256 value, bytes32 dataFeedId, uint256 blockTimestamp, uint256 updaterTimestamp, uint256 updaterId);
}
