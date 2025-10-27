// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {MultiFeedAdapterWithoutRounds} from "../without-rounds/MultiFeedAdapterWithoutRounds.sol";

abstract contract MultiFeedAdapterWithoutRoundsBoltPrimaryProd is MultiFeedAdapterWithoutRounds {
  function getUniqueSignersThreshold() public view virtual override returns (uint8) {
    return 3;
  }

  function getAuthorisedSignerIndex(
    address signerAddress
  ) public view virtual override returns (uint8) {
    if (signerAddress == 0x8BB8F32Df04c8b654987DAaeD53D6B6091e3B774) { return 0; }
    else if (signerAddress == 0xdEB22f54738d54976C4c0fe5ce6d408E40d88499) { return 1; }
    else if (signerAddress == 0x51Ce04Be4b3E32572C4Ec9135221d0691Ba7d202) { return 2; }
    else if (signerAddress == 0xDD682daEC5A90dD295d14DA4b0bec9281017b5bE) { return 3; }
    else if (signerAddress == 0x9c5AE89C4Af6aA32cE58588DBaF90d18a855B6de) { return 4; }
    else if (signerAddress == 0xf1B20cf4CFac262D462b919Ad048263B32d682aF) { return 5; }
    else if (signerAddress == 0x6dBB798F484Ae044290d4a03cfA74A3AE760ee54) { return 6; }
    else if (signerAddress == 0x50d5c34354092790c51e516CE3f7cB8a30b79fF1) { return 7; }
    else if (signerAddress == 0x711F2DC1C8120f5E927De79e4a1Eec2C35579F2a) { return 8; }
    else if (signerAddress == 0x080B4dB52c765Ef7b0E7156E5171F5e5999D06be) { return 9; }
    else {
      revert SignerNotAuthorised(signerAddress);
    }
  }
}
