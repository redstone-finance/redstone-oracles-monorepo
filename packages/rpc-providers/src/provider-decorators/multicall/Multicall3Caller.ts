import { BlockTag } from "@ethersproject/abstract-provider";
import {
  type ChainConfigs,
  getChainConfigByNetworkId,
  getLocalChainConfigs,
  getMulticall3,
} from "@redstone-finance/chain-configs";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Contract, providers, utils } from "ethers";
import Multicall3Abi from "./Multicall3.abi.json";

export const MULTICALL3_INTERFACE = new utils.Interface(Multicall3Abi.abi);
export const GET_ETH_BALANCE_FN = "getEthBalance";
export const MULTICALL3_SELF_TARGET = "__MULTICALL3__";

export type Multicall3Request = {
  target: string;
  allowFailure: boolean;
  callData: string;
  gasLimit?: number;
};

export type Multicall3Result = {
  returnData: string;
  fallbackRejectReason?: unknown;
  success: boolean;
};

function rawMulticall3(
  multicall3Contract: Contract,
  call3s: Multicall3Request[],
  blockTag?: BlockTag
): Promise<Multicall3Result[]> {
  return multicall3Contract.callStatic.aggregate3(call3s, {
    blockTag,
  }) as Promise<Multicall3Result[]>;
}

const logger = loggerFactory("multicall3");
/** [TURBO IMPORTANT] this function MUST NOT throw errors */
export async function safeExecuteMulticall3(
  provider: providers.Provider,
  call3s: Multicall3Request[],
  retryBySingleCalls: boolean,
  blockTag?: BlockTag,
  multicallAddress?: string,
  chainConfigs?: ChainConfigs
): Promise<Multicall3Result[]> {
  let chainId = -1;
  try {
    chainId = (await provider.getNetwork()).chainId;
    const multicall3Contract = getMulticall3(
      {
        overrideAddress: multicallAddress,
        signerOrProvider: provider,
      },
      getChainConfigByNetworkId(chainConfigs ?? getLocalChainConfigs(), chainId)
    );
    if (!multicall3Contract) {
      throw new Error(`Multicall3 not defined for chain ${chainId}.`);
    }

    // Self-target sentinels (e.g. getBalance) are translated to the resolved Multicall3
    // address only for the aggregate3 call. The catch branch keeps the original sentinel
    // so safeFallbackCall can dispatch them to provider.getBalance directly.
    const fixedCalls = call3s.map((call) =>
      call.target === MULTICALL3_SELF_TARGET
        ? { ...call, target: multicall3Contract.address }
        : call
    );

    return await rawMulticall3(multicall3Contract, fixedCalls, blockTag);
  } catch (e) {
    if (retryBySingleCalls) {
      // if whole multicall failed & retryBySingleCalls is disabled, fallback to normal execution model (1 call = 1 request)
      logger.error(
        `Whole multicall3 chainId=${chainId} failed. Will fallback to ${
          call3s.length
        } separate calls. Error: ${RedstoneCommon.stringifyError(e)}`
      );

      return await Promise.all(call3s.map((call3) => safeFallbackCall(provider, call3, blockTag)));
    } else {
      const errorDescription = `Whole multicall3 chainId=${chainId} failed. Will not fallback. Error: ${RedstoneCommon.stringifyError(e)}`;

      return call3s.map(() => ({
        returnData: "0x",
        fallbackRejectReason: new Error(errorDescription),
        success: false,
      }));
    }
  }
}

/* we intentionally ignore gasLimit,
 * because if call failed on RedstoneMulticall3 it was probably caused by gasLimit
 */
async function safeFallbackCall(
  provider: providers.Provider,
  call3: Multicall3Request,
  blockTag: BlockTag | undefined
) {
  if (call3.target === MULTICALL3_SELF_TARGET) {
    return await safeFallbackSelfCall(provider, call3, blockTag);
  }
  try {
    const callResult = await provider.call({ to: call3.target, data: call3.callData }, blockTag);
    logger.debug(
      `fallback call succeeded to=${call3.target} data=${call3.callData} blockTag=${blockTag}`
    );
    return {
      returnData: callResult,
      success: true,
    };
  } catch (e) {
    logger.log(
      `fallback call failed to=${call3.target} data=${call3.callData} blockTag=${blockTag}`
    );
    return {
      returnData: "0x",
      fallbackRejectReason: e,
      success: false,
    };
  }
}

/** Fallback for self-targeted multicall3 calls — dispatches them back to native
 *  provider methods (e.g. provider.getBalance) instead of going through the multicall3
 *  contract over RPC. */
async function safeFallbackSelfCall(
  provider: providers.Provider,
  call3: Multicall3Request,
  blockTag: BlockTag | undefined
): Promise<Multicall3Result> {
  try {
    const fragment = MULTICALL3_INTERFACE.getFunction(call3.callData.slice(0, 10));
    const args = MULTICALL3_INTERFACE.decodeFunctionData(fragment, call3.callData);

    if (fragment.name === GET_ETH_BALANCE_FN) {
      const [addr] = args as [string];
      const balance = await provider.getBalance(addr, blockTag);
      logger.debug(`fallback self-call getEthBalance succeeded addr=${addr} blockTag=${blockTag}`);
      // ABI-encode as uint256 (32-byte big-endian) to match what aggregate3 would return.
      return { returnData: utils.hexZeroPad(balance.toHexString(), 32), success: true };
    }

    throw new Error(`Unhandled self-targeted multicall3 selector: ${fragment.name}`);
  } catch (e) {
    logger.log(
      `fallback self-call failed data=${call3.callData} blockTag=${blockTag} error=${RedstoneCommon.stringifyError(e)}`
    );
    return {
      returnData: "0x",
      fallbackRejectReason: e,
      success: false,
    };
  }
}
