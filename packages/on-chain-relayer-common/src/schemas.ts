import { NetworkIdSchema } from "@redstone-finance/utils";
import { z } from "zod";

export const PRICE_FEEDS = "price-feeds";
export const MENTO = "mento";
export const MULTI_FEED = "multi-feed";

export const AdapterTypesEnum = z.enum([PRICE_FEEDS, MENTO, MULTI_FEED]);

export type AdapterType = z.infer<typeof AdapterTypesEnum>;

export const ChainSchema = z.object({
  name: z.string(),
  id: NetworkIdSchema,
});

export const UpdateTriggersSchema = z.object({
  cron: z.array(z.string()).optional(),
  deviationPercentage: z.number().optional(),
  timeSinceLastUpdateInMilliseconds: z.number().optional(),
  priceFeedsDeviationOverrides: z.record(z.string(), z.number()).optional(),
});

export type UpdateTriggers = z.infer<typeof UpdateTriggersSchema>;

const PriceFeedConfigSchema = z.object({
  priceFeedAddress: z.string().optional(),
  updateTriggersOverrides: UpdateTriggersSchema.optional(),
});

export const CommonManifestSchema = z.object({
  chain: ChainSchema,
  updateTriggers: UpdateTriggersSchema,
  adapterContract: z.string(),
  adapterContractPackageId: z.string().optional(),
  adapterContractType: AdapterTypesEnum,
  dataServiceId: z.string(),
  priceFeeds: z.record(z.string(), z.any()),
  dataPackagesNames: z.array(z.string()).optional(),
});

export const CommonManifestSchemaStrict = CommonManifestSchema.extend({
  chain: ChainSchema.strict(),
  updateTriggers: UpdateTriggersSchema.strict(),
}).strict();

const OnChainRelayerManifestExtension = {
  adapterContractType: AdapterTypesEnum.default(PRICE_FEEDS),
  priceFeeds: z.record(z.string(), z.string()),
  authorizedSigners: z.array(z.string()).optional(),
};

const MultiFeedOnChainRelayerManifestExtension = {
  adapterContractType: AdapterTypesEnum.default(MULTI_FEED),
  priceFeeds: z.record(z.string(), PriceFeedConfigSchema),
  authorizedSigners: z.array(z.string()).optional(),
};

const MultiFeedOnChainRelayerManifestExtensionStrict = {
  priceFeeds: z.record(z.string(), PriceFeedConfigSchema.strict()),
};

export const OnChainRelayerManifestSchema = CommonManifestSchema.extend(
  OnChainRelayerManifestExtension
);

export const MultiFeedOnChainRelayerManifestSchema = CommonManifestSchema.extend(
  MultiFeedOnChainRelayerManifestExtension
);

export const OnChainRelayerManifestSchemaStrict = CommonManifestSchemaStrict.extend(
  OnChainRelayerManifestExtension
).strict();

export const MultiFeedOnChainRelayerManifestSchemaStrict = CommonManifestSchemaStrict.extend({
  ...MultiFeedOnChainRelayerManifestExtension,
  ...MultiFeedOnChainRelayerManifestExtensionStrict,
}).strict();

export const AnyOnChainRelayerManifestSchema = z.union([
  OnChainRelayerManifestSchema,
  MultiFeedOnChainRelayerManifestSchema,
]);

export type PriceFeedConfig = z.infer<typeof PriceFeedConfigSchema>;

export type MultiFeedOnChainRelayerManifest = z.infer<typeof MultiFeedOnChainRelayerManifestSchema>;

export type MultiFeedOnChainRelayerManifestInput = z.input<
  typeof MultiFeedOnChainRelayerManifestSchema
>;

export type OnChainRelayerManifest = z.infer<typeof OnChainRelayerManifestSchema>;

export type OnChainRelayerManifestInput = z.input<typeof OnChainRelayerManifestSchema>;

export type CommonRelayerManifest = z.infer<typeof CommonManifestSchema>;

export type AnyOnChainRelayerManifest = z.infer<typeof AnyOnChainRelayerManifestSchema>;

export type AnyOnChainRelayerManifestInput = z.input<typeof AnyOnChainRelayerManifestSchema>;

export type ManifestType =
  | typeof MANIFEST_TYPE_PRICE_FEEDS
  | typeof MANIFEST_TYPE_MULTI_FEED
  | typeof MANIFEST_TYPE_NON_EVM;

export const MANIFEST_TYPE_PRICE_FEEDS = "price-feeds";
export const MANIFEST_TYPE_MULTI_FEED = "multi-feed";
export const MANIFEST_TYPE_NON_EVM = "non-evm";

export const MANIFEST_DIRS: Record<ManifestType, string> = {
  [MANIFEST_TYPE_PRICE_FEEDS]: "relayer-manifests",
  [MANIFEST_TYPE_MULTI_FEED]: "relayer-manifests-multi-feed",
  [MANIFEST_TYPE_NON_EVM]: "relayer-manifests-non-evm",
};
