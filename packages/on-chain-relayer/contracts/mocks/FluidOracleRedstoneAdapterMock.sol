// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import {EthUsdcRedstoneAdapterForFluidOracle} from "../custom-integrations/fluid/EthUsdcRedstoneAdapterForFluidOracle.sol";
import {AuthorisedMockSignersBase} from "@redstone-finance/evm-connector/contracts/mocks/AuthorisedMockSignersBase.sol";

contract FluidOracleRedstoneAdapterMock is EthUsdcRedstoneAdapterForFluidOracle,AuthorisedMockSignersBase {
  function getUniqueSignersThreshold() public view virtual override returns (uint8) {
    return 2;
  }

  function getAuthorisedSignerIndex(address signerAddress)
    public
    view
    virtual
    override
    returns (uint8)
  {
    return getAuthorisedMockSignerIndex(signerAddress);
  }
}