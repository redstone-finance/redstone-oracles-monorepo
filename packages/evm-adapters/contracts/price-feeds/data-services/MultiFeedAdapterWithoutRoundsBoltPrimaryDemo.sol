// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {MultiFeedAdapterWithoutRounds} from "../without-rounds/MultiFeedAdapterWithoutRounds.sol";

abstract contract MultiFeedAdapterWithoutRoundsBoltPrimaryDemo is MultiFeedAdapterWithoutRounds {
  function getUniqueSignersThreshold() public view virtual override returns (uint8) {
    return 2;
  }

  function getAuthorisedSignerIndex(
    address signerAddress
  ) public view virtual override returns (uint8) {
    if (signerAddress == 0x21F05763188246E9F1FdAe3Bb67465a1E81b9f21) { return 0; }
    else if (signerAddress == 0x3F12DE3492D044FeB08a88b402455026B0f1ae04) { return 1; }
    else if (signerAddress == 0x5451dB9e574C3a9f9C0DA324E498093AC185169A) { return 2; }
    else if (signerAddress == 0xdE13FdEE7a9B483129a81794d02FCB4021069f0C) { return 3; }
    else if (signerAddress == 0xad05Ce43E0bCD11345f08a28995951DEc30D5226) { return 4; }
    else {
      revert SignerNotAuthorised(signerAddress);
    }
  }
}
