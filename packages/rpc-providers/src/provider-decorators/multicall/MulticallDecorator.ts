import { BlockTag, TransactionRequest } from "@ethersproject/abstract-provider";
import {
  type ChainConfigs,
  getChainConfigByNetworkId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { BigNumber, providers } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { z } from "zod";
import {
  GET_ETH_BALANCE_FN,
  MULTICALL3_INTERFACE,
  MULTICALL3_SELF_TARGET,
  Multicall3Request,
  safeExecuteMulticall3,
} from "./Multicall3Caller";
import { blockTagToBlockId, MulticallBuffer } from "./MulticallBuffer";

async function prepareMulticall3Call(
  tx: Deferrable<TransactionRequest>
): Promise<Multicall3Request> {
  return {
    callData: (await tx["data"]) as string,
    target: (await tx["to"]) as string,
    allowFailure: true,
  };
}

function prepareMulticall3GetBalanceCall(resolvedAddress: string): Multicall3Request {
  const callData = MULTICALL3_INTERFACE.encodeFunctionData(GET_ETH_BALANCE_FN, [resolvedAddress]);

  return { callData, allowFailure: true, target: MULTICALL3_SELF_TARGET };
}

function decorateMulticall3Request(
  call: Multicall3Request,
  chainId: number,
  chainConfigs?: ChainConfigs
) {
  const multicall3Info = getChainConfigByNetworkId(
    chainConfigs ?? getLocalChainConfigs(),
    chainId
  ).multicall3;

  if (multicall3Info.type === "RedstoneMulticall3") {
    call.gasLimit = multicall3Info.gasLimitPerCall;
  }

  return call;
}

const logger = loggerFactory("MulticallProvider");

export type MulticallDecoratorOptions = {
  maxCallsCount?: number;
  maxCallDataSize?: number;
  /** If set to -1 auto resolve is disabled */
  autoResolveInterval?: number;
  multicallAddress?: string;
  retryBySingleCalls?: boolean;
  useGetBalanceMulticall?: boolean;
  chainConfigs?: ChainConfigs;
};

const parseMulticallConfig = (opts: MulticallDecoratorOptions) => {
  return {
    multicallAddress:
      opts.multicallAddress ??
      RedstoneCommon.getFromEnv("MULTICALL_CONTRACT_ADDRESS", z.string().optional()),
    autoResolveInterval:
      opts.autoResolveInterval ??
      RedstoneCommon.getFromEnv("MULTICALL_AUTO_RESOLVE_INTERVAL", z.number().default(100)),
    maxCallsCount:
      opts.maxCallsCount ??
      RedstoneCommon.getFromEnv("MULTICALL_MAX_CALLS_COUNT", z.number().default(15)),
    maxCallDataSize:
      opts.maxCallDataSize ??
      RedstoneCommon.getFromEnv("MULTICALL_MAX_CALL_DATA_SIZE", z.number().default(50_000)), // 0.05MB
    retryBySingleCalls:
      opts.retryBySingleCalls ??
      RedstoneCommon.getFromEnv("MULTICALL_RETRY_BY_SINGLE_CALLS", z.boolean().default(false)),
    useGetBalanceMulticall:
      opts.useGetBalanceMulticall ??
      RedstoneCommon.getFromEnv("MULTICALL_USE_GET_BALANCE", z.boolean().default(true)),
  };
};

export function MulticallDecorator<T extends providers.Provider>(
  buildProvider: () => T,
  options: MulticallDecoratorOptions = {}
): () => T {
  const timeouts: Map<number, NodeJS.Timeout> = new Map();
  const config = parseMulticallConfig(options);
  const originalProvider = buildProvider();
  const modifiedProvider = RedstoneCommon.cloneClassInstance(originalProvider);
  const queue = new MulticallBuffer(config.maxCallsCount, config.maxCallDataSize);

  let chainId: number | undefined = undefined;
  const chainIdPromise = originalProvider.getNetwork().then((n) => n.chainId);

  const executeCallsFromQueue = (blockTag: BlockTag | undefined) => {
    const blockId = blockTagToBlockId(blockTag);
    clearTimeout(timeouts.get(blockId));
    timeouts.delete(blockId);
    const callDataSize = queue.callDataSize(blockTag);
    const callEntries = queue.flush(blockTag);

    logger.debug(
      `Executing request chainId=${chainId} blockTag=${blockTag} callsCount=${callEntries.length} callDataSize=${callDataSize} [bytes]`
    );

    safeExecuteMulticall3(
      originalProvider,
      callEntries,
      config.retryBySingleCalls,
      blockTag,
      config.multicallAddress,
      options.chainConfigs
    )
      .then((result3s) => {
        for (let i = 0; i < result3s.length; i++) {
          // we should handle fallback specially because they can fail partially
          if (result3s[i].fallbackRejectReason) {
            callEntries[i].reject(result3s[i].fallbackRejectReason);
          } else if (!result3s[i].success) {
            callEntries[i].reject(
              `call failed with CALL_EXCEPTION to=${callEntries[i].target} blockTag=${callEntries[i].blockTag} callData=${callEntries[i].callData} returnData=${result3s[i].returnData}`
            );
          } else {
            callEntries[i].resolve(result3s[i].returnData);
          }
        }
      })
      .catch((e) => {
        logger.log(`call failed rejecting ${callEntries.length} bounded promises`);
        // if multicall fails we have to reject all promises bounded to it
        for (const entry of callEntries) {
          entry.reject(e);
        }
      });
  };

  function pushEntry(multicall3Request: Multicall3Request, resolvedBlockTag?: BlockTag) {
    const { promise, resolve, reject } = createDeferredPromise<string>();

    const entry = {
      ...multicall3Request,
      blockTag: resolvedBlockTag,
      resolve,
      reject,
    };

    if (queue.willCallDataSizeBeExceeded(resolvedBlockTag, entry)) {
      executeCallsFromQueue(resolvedBlockTag);
    }

    queue.push(resolvedBlockTag, entry);
    if (config.autoResolveInterval > 0) {
      const blockId = blockTagToBlockId(resolvedBlockTag);
      if (!timeouts.has(blockId)) {
        const timeout = setTimeout(
          () => executeCallsFromQueue(resolvedBlockTag),
          config.autoResolveInterval
        );
        timeouts.set(blockId, timeout);
      }
    }

    if (queue.isCallsCountFull(resolvedBlockTag)) {
      executeCallsFromQueue(resolvedBlockTag);
    }

    return promise;
  }

  const call = async (
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    const [resolvedChainId, requestCall, resolvedBlockTag] = await Promise.all([
      chainIdPromise,
      prepareMulticall3Call(transaction),
      blockTag,
    ]);
    chainId = resolvedChainId;

    const multicall3Request = decorateMulticall3Request(requestCall, chainId, options.chainConfigs);

    return await pushEntry(multicall3Request, resolvedBlockTag);
  };

  const getBalance = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<BigNumber> => {
    const [resolvedChainId, resolvedAddress, resolvedBlockTag] = await Promise.all([
      chainIdPromise,
      addressOrName,
      blockTag,
    ]);
    chainId = resolvedChainId;
    const multicall3getBalanceRequest = prepareMulticall3GetBalanceCall(resolvedAddress);

    const multicall3Request = decorateMulticall3Request(
      multicall3getBalanceRequest,
      chainId,
      options.chainConfigs
    );

    const result = await pushEntry(multicall3Request, resolvedBlockTag);

    return BigNumber.from(result);
  };

  modifiedProvider.call = call;
  if (config.useGetBalanceMulticall) {
    modifiedProvider.getBalance = getBalance;
  }

  return () => modifiedProvider;
}

function createDeferredPromise<T>() {
  let resolve: (data: T) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });

  return { promise, resolve: resolve!, reject: reject! };
}
