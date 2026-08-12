import { SuiNetworkName } from "../config";
import { makeSuiGraphQLClient } from "../util";
import { CHAIN_IDENTIFIER_QUERY } from "./queries";

export async function getSuiGraphqlChainIdentifier(
  baseUrl: string,
  network: SuiNetworkName
): Promise<string> {
  const client = makeSuiGraphQLClient(network, baseUrl);

  const result = await client.query({ query: CHAIN_IDENTIFIER_QUERY });

  if (result.errors?.length) {
    throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join("; ")}`);
  }

  const chainIdentifier = result.data?.chainIdentifier;
  if (!chainIdentifier) {
    throw new Error("GraphQL returned no chainIdentifier");
  }

  return chainIdentifier;
}
