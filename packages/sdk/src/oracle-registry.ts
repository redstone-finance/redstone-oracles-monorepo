import { default as redstoneOraclesInitialState } from "./registry/initial-state.json";

export interface RedstoneOraclesState {
  contractAdmins: string[];
  nodes: Nodes;
  dataServices: DataServices;
}

export type DataServiceIds =
  keyof (typeof redstoneOraclesInitialState)["dataServices"];

export type Nodes = { [key: string]: Node };
export type RegisterNodeInputData = Node;
export type DataServices = { [key: string]: DataService };

export interface Node {
  name: string;
  logo: string;
  description: string;
  dataServiceId: string;
  evmAddress: string;
  ipAddress: string;
  ecdsaPublicKey: string;
  url?: string;
  dateAdded: string;
}

export interface DataService {
  name: string;
  manifestTxId?: string;
  logo: string;
  description: string;
  admin?: string;
}

export const EXTERNAL_SIGNERS_CUTOFF_DATE = new Date("2024-01-02").getTime();

export const getOracleRegistryState =
  async (): Promise<RedstoneOraclesState> => {
    return await Promise.resolve(redstoneOraclesInitialState);
  };

export const getOracleRegistryStateSync = () => redstoneOraclesInitialState;

export const getDataServiceIdForSigner = (
  oracleState: RedstoneOraclesState,
  signerAddress: string
) => {
  for (const nodeDetails of Object.values(oracleState.nodes)) {
    if (nodeDetails.evmAddress.toLowerCase() === signerAddress.toLowerCase()) {
      return nodeDetails.dataServiceId;
    }
  }
  throw new Error(`Data service not found for ${signerAddress}`);
};

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
