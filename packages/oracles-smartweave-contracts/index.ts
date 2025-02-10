import { default as redstoneOraclesInitialState } from "./src/contracts/redstone-oracle-registry/initial-state.json";

const EXTERNAL_SIGNERS_CUTOFF_DATE = new Date("2024-01-02").getTime();

export type DataServiceIds =
  keyof (typeof redstoneOraclesInitialState)["dataServices"];

const preloadedSigners = new Map<
  DataServiceIds,
  { internal: string[]; all: string[] }
>();

(
  Object.keys(redstoneOraclesInitialState.dataServices) as DataServiceIds[]
).forEach((dataServiceId) => {
  const internalSigners = Object.values(redstoneOraclesInitialState.nodes)
    .filter(
      (node) =>
        node.dataServiceId === dataServiceId &&
        new Date(node.dateAdded).getTime() < EXTERNAL_SIGNERS_CUTOFF_DATE
    )
    .map((node) => node.evmAddress);

  const allSigners = Object.values(redstoneOraclesInitialState.nodes)
    .filter((node) => node.dataServiceId === dataServiceId)
    .map((node) => node.evmAddress);

  preloadedSigners.set(dataServiceId, {
    internal: internalSigners,
    all: allSigners,
  });
});

export function getSignersForDataServiceId(
  dataServiceId: DataServiceIds,
  allowExternalSigners: boolean = false
): string[] {
  const cached = preloadedSigners.get(dataServiceId);
  if (!cached) {
    throw new Error(`No signers found for data service id: ${dataServiceId}`);
  }

  const signers = allowExternalSigners ? cached.all : cached.internal;

  if (signers.length === 0) {
    throw new Error(
      `No ${allowExternalSigners ? "" : "internal"} signers found for: ${dataServiceId}`
    );
  }

  return signers;
}

export * from "./src/contracts/redstone-oracle-registry/types";
export { redstoneOraclesInitialState };
