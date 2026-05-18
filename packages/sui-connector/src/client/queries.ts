import { graphql, ResultOf } from "@mysten/sui/graphql/schema";

export const RECEIVED_TRANSACTIONS_QUERY = graphql(`
  query ReceivedTransactions($address: SuiAddress!, $first: Int, $after: String) {
    transactions(first: $first, after: $after, filter: { affectedAddress: $address }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        effects {
          objectChanges {
            nodes {
              outputState {
                address
                asMoveObject {
                  contents {
                    type {
                      repr
                    }
                  }
                }
                owner {
                  ... on AddressOwner {
                    owner: address {
                      address
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

export type ReceivedTransactionsData = ResultOf<typeof RECEIVED_TRANSACTIONS_QUERY>;
