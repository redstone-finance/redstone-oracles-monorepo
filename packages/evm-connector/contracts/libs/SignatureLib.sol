// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

library SignatureLib {
  uint256 constant ECDSA_SIG_R_BS = 32;
  uint256 constant ECDSA_SIG_S_BS = 32;
  
  // Constants for ECDSA recovery ids
  uint8 constant RECOVERY_ID_27 = 27;
  uint8 constant RECOVERY_ID_28 = 28;

  // Constant representing half of the curve order (secp256k1n / 2)
  uint256 constant HALF_CURVE_ORDER = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

  error InvalidSignature(bytes32 signedHash);

  function recoverSignerAddress(bytes32 signedHash, uint256 signatureCalldataNegativeOffset)
    internal
    pure
    returns (address signerAddress)
  {
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
      let signatureCalldataStartPos := sub(calldatasize(), signatureCalldataNegativeOffset)
      r := calldataload(signatureCalldataStartPos)
      signatureCalldataStartPos := add(signatureCalldataStartPos, ECDSA_SIG_R_BS)
      s := calldataload(signatureCalldataStartPos)
      signatureCalldataStartPos := add(signatureCalldataStartPos, ECDSA_SIG_S_BS)
      v := byte(0, calldataload(signatureCalldataStartPos)) // last byte of the signature memory array
    }
    // 27 and 28 are the only two valid recovery ids used for ECDSA signatures in Ethereum
    if (v != RECOVERY_ID_27 && v != RECOVERY_ID_28) {
      revert InvalidSignature(signedHash);
    }
    // Ensure that the s value is in the lower half of the secp256k1 curve order (s < secp256k1n/2+1)
    // to avoid signature malleability issues.
    if (uint256(s) > HALF_CURVE_ORDER) {
      revert InvalidSignature(signedHash);
    }
    signerAddress = ecrecover(signedHash, v, r, s);
    if (signerAddress == address(0)) {
      revert InvalidSignature(signedHash);
    }
  }
}
