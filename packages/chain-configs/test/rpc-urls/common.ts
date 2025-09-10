import {
  deconstructNetworkId,
  isNonEvmNetworkId,
  loggerFactory,
  NetworkId,
  RedstoneCommon,
  sanitizeLogMessage,
} from "@redstone-finance/utils";
import chai from "chai";
import { ethers } from "ethers";
import { RpcUrlsPerChain } from "../../scripts/read-ssm-rpc-urls";
import { ChainConfig, getChainConfigByNetworkId, getLocalChainConfigs } from "../../src";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
};
const logger = loggerFactory("chain-config/rpc-urls");

export const validateNetworkRpcUrls = (rpcUrlsPerChain: RpcUrlsPerChain) => {
  for (const [name, { networkId, rpcUrls }] of Object.entries(rpcUrlsPerChain)) {
    describe(`Network Validation for ${name} (${networkId})`, function () {
      before(function () {
        const chainConfig = getChainConfigByNetworkId(getLocalChainConfigs(), networkId);
        skipIfDisabledOrNotSupported(this, chainConfig, CHAINS_TO_SKIP_CHECK);
      });

      const { chainId } = deconstructNetworkId(networkId);

      for (const rpcUrl of rpcUrls) {
        const host = getRpcHost(rpcUrl);

        it(`Test getNetwork '${name}' rpc url: ${host}`, async function () {
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          const fetchedChainId = await RedstoneCommon.retry({
            ...RETRY_CONFIG,
            fn: async () => (await provider.getNetwork()).chainId,
            fnName: "provider.getNetwork()",
            logger: logger.log,
          })();

          chai.expect(fetchedChainId, `Wrong networkId`).to.eq(chainId);
        });
      }
    });
  }
};

const getBlockNumberWithTimeout = async (rpcUrl: string, timeout: number): Promise<number> => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const host = getRpcHost(rpcUrl);
  const blockNumber = await RedstoneCommon.retry({
    ...RETRY_CONFIG,
    fn: async () => {
      return await RedstoneCommon.timeout(
        provider.getBlockNumber(),
        timeout,
        `Timeout for RPC: ${host}`
      );
    },
    fnName: `provider.getBlockNumber() for ${host}`,
    logger: logger.log,
  })();
  return blockNumber;
};

export const validateBlockNumberAgreementBetweenRpcs = (
  rpcUrlsPerChain: RpcUrlsPerChain,
  tolerance: number
) => {
  for (const [name, { networkId, rpcUrls }] of Object.entries(rpcUrlsPerChain)) {
    describe(`Block Number Agreement Validation for ${name} (${networkId})`, function () {
      before(function () {
        const chainConfig = getChainConfigByNetworkId(getLocalChainConfigs(), networkId);
        skipIfDisabledOrNotSupported(this, chainConfig, CHAINS_TO_SKIP_CHECK);
      });

      let blockNumbers: { rpcUrl: string; blockNumber: number | null }[] = [];
      let maxBlockNumber: number | null = null;

      before(async function () {
        const results = await Promise.allSettled(
          rpcUrls.map(async (rpcUrl) => {
            try {
              const blockNumber = await getBlockNumberWithTimeout(rpcUrl, 5000);
              return { rpcUrl, blockNumber };
            } catch (error) {
              logger.warn(`Failed to fetch block number`, {
                rpcUrl: sanitizeLogMessage(rpcUrl),
                error,
              });
              throw new Error(
                `Failed to fetch block number for RPC: ${sanitizeLogMessage(rpcUrl)}`
              );
            }
          })
        );

        blockNumbers = results.map((result) => {
          if (result.status === "fulfilled") {
            return result.value;
          } else {
            return { rpcUrl: "", blockNumber: null };
          }
        });

        maxBlockNumber = Math.max(
          ...blockNumbers.map((b) => b.blockNumber).filter(RedstoneCommon.isDefined)
        );
      });

      rpcUrls.forEach((rpcUrl) => {
        const host = getRpcHost(rpcUrl);

        it(`should validate block number agreement for RPC: ${host}`, function () {
          const currentBlock = blockNumbers.find((b) => b.rpcUrl === rpcUrl);
          if (!RedstoneCommon.isDefined(currentBlock?.blockNumber)) {
            throw new Error(`Failed to fetch block number for RPC: ${host}`);
          }

          const blockNumberDifference = Math.abs(currentBlock.blockNumber - maxBlockNumber!);

          chai
            .expect(blockNumberDifference)
            .to.be.at.most(
              tolerance,
              `Block number mismatch for ${host}: Expected a maximum tolerance of ${tolerance} from the highest block, got ${blockNumberDifference} (current: ${currentBlock.blockNumber}, max: ${maxBlockNumber})`
            );
        });
      });
    });
  }
};

const getRpcHost = (rpcUrl: string): string => {
  const url = new URL(rpcUrl);
  return url.host;
};

export function skipIfDisabledOrNotSupported(
  subject: { skip: () => void },
  chainConfig: ChainConfig,
  chainsToSkip: string[] = []
) {
  const disabledNetworks = (process.env.DISABLED_NETWORKS ?? []) as NetworkId[];
  if (
    disabledNetworks.includes(chainConfig.networkId) ||
    isNonEvmNetworkId(chainConfig.networkId) ||
    chainsToSkip.includes(chainConfig.name)
  ) {
    subject.skip();
  }
}

const CHAINS_TO_SKIP_CHECK: string[] = [];
