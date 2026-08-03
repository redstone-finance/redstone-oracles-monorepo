import type { Provider } from "@ethersproject/abstract-provider";
import type { ChainConfig } from "@redstone-finance/chain-configs";
import {
  EvmMulticallTypes,
  Multicall3Abi,
  RedstoneMulticall3Abi,
} from "@redstone-finance/evm-multicall";
import { evmContract } from "../../evm-contract";

export type Multicall3Options = {
  overrideAddress?: string;
  provider: Provider;
};

export function getMulticall3(
  opts: Multicall3Options,
  chainConfig: ChainConfig
): EvmMulticallTypes.Multicall3 | EvmMulticallTypes.RedstoneMulticall3 | undefined {
  const { multicall3 } = chainConfig;
  const address = opts.overrideAddress ?? multicall3.address;
  if (address === "") {
    return undefined;
  }

  if (multicall3.type === "Multicall3") {
    return Object.assign(
      evmContract<EvmMulticallTypes.Multicall3>(address, Multicall3Abi, opts.provider),
      { address }
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive against multicall3.type outside the typed union
  } else if (multicall3.type === "RedstoneMulticall3") {
    return Object.assign(
      evmContract<EvmMulticallTypes.RedstoneMulticall3>(
        address,
        RedstoneMulticall3Abi,
        opts.provider
      ),
      { address }
    );
  } else {
    throw new Error(`Unknown multicall3.type=${String(multicall3)}`);
  }
}
