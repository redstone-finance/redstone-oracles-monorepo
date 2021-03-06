// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

// import "hardhat/console.sol";
import "../message-based/RedstoneConsumerBase.sol";

contract RedstoneConsumerMock is RedstoneConsumerBase {
  function isSignerAuthorized(address _receviedSigner) public view virtual override returns (bool) {
    // console.log("Received signer: ", _receviedSigner);
    // console.log(
    //   "Expected signer: ",
    //   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    // );

    // Mock signer address
    return _receviedSigner == 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
  }

  function isTimestampValid(uint256 _receivedTimestamp)
    public
    view
    virtual
    override
    returns (bool)
  {
    // console.log("Received timestamp", _receivedTimestamp);
    _receivedTimestamp;
    return true;
  }
}
