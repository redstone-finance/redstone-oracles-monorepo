import { z } from "zod";
import chainConfigs from "../manifest/chain-configs.json";

import { ChainTypeEnum } from "./ChainType";

export { chainConfigs };

export const ChainConfigSchema = z.object({
  chainId: z.number().positive(),
  chainType: ChainTypeEnum.default("evm"),
  name: z.string(),
  publicRpcUrls: z.string().url().array(),
  currencySymbol: z.string(),
  avgBlockTimeMs: z.number(),
  isAuctionModel: z.boolean(),
  twoDimensionalFees: z.boolean(),
  isMainnet: z.boolean(),
  disabled: z.boolean().default(false),
  etherScanApi: z.string().url().optional(),
  /**
   * Some blockchains don't have empty blocks, thus eth_feeHistory returns 0, but they have
   * minimal maxPriorityFeePerGas requirement.
   * In such a case we can use eth_maxPriorityFeePerGas rpc call to obtain this minimal value.
   * Be aware that some of the chains accepts 0 as tip if blocks are empty or don't use tips at all and always returns 0 from eth_feeHistory - in such a cases this value should be left to default
   */
  fallbackToEthMaxPriorityFeePerGas: z.boolean().default(false),
  multicall3: z
    .object({
      address: z.string(),
      type: z.literal("Multicall3"),
    })
    .or(
      z.object({
        address: z.string(),
        type: z.literal("RedstoneMulticall3"),
        gasLimitPerCall: z.number().positive(),
      })
    ),
});

export const ChainConfigsSchema = z.record(z.string(), ChainConfigSchema);
export const ChainConfigsByIdAndTypeSchema = z.record(
  z.string(),
  ChainConfigSchema
);

export type ChainConfigsInput = z.input<typeof ChainConfigsSchema>;
export type ChainConfig = z.infer<typeof ChainConfigSchema>;
export type ChainConfigs = z.infer<typeof ChainConfigsSchema>;
export type ChainConfigsByIdAndType = z.infer<
  typeof ChainConfigsByIdAndTypeSchema
>;
export type SupportedNetworkNames = keyof typeof chainConfigs.defaultConfig;

export const SupportedNetworkNamesSchema = z.custom<SupportedNetworkNames>(
  (val): val is SupportedNetworkNames => {
    return (
      typeof val === "string" &&
      Object.keys(chainConfigs.defaultConfig).includes(val)
    );
  },
  {
    message: "Value must be a valid network name",
  }
);

export const TokenMapSchema = z.record(
  z.string(),
  z.object({
    address: z.string(),
    decimals: z.number().int().nonnegative(),
  })
);

export const ChainTokenMapSchema = z.record(
  SupportedNetworkNamesSchema,
  TokenMapSchema.optional()
);

export const STANDARD_MULTICALL3_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11";
export const REDSTONE_MULTICALL3_ADDRESS =
  "0xaD6CC5a465E5c8284a49eC9eD10EFE275460678c";
