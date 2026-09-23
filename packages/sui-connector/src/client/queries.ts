import { graphql } from "@mysten/sui/graphql/schema";

export const CHAIN_IDENTIFIER_QUERY = graphql(`
  query {
    chainIdentifier
  }
`);

export const RECEIVED_TRANSACTIONS_QUERY = graphql(`
  query ReceivedTransactions($address: SuiAddress!, $last: Int, $before: String) {
    transactions(last: $last, before: $before, filter: { affectedAddress: $address }) {
      pageInfo {
        hasPreviousPage
        startCursor
      }
      nodes {
        sender {
          address
        }
        effects {
          objectChanges(first: 50) {
            pageInfo {
              hasNextPage
            }
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

export const AFFECTED_OBJECT_TRANSACTIONS_QUERY = graphql(`
  query AffectedObjectTransactions(
    $objectId: SuiAddress!
    $last: Int
    $before: String
    $afterCheckpoint: UInt53
    $beforeCheckpoint: UInt53
  ) {
    transactions(
      last: $last
      before: $before
      filter: {
        affectedObject: $objectId
        afterCheckpoint: $afterCheckpoint
        beforeCheckpoint: $beforeCheckpoint
      }
    ) {
      pageInfo {
        hasPreviousPage
        startCursor
      }
      nodes {
        digest
        sender {
          address
        }
        effects {
          checkpoint {
            sequenceNumber
            timestamp
          }
          status
          gasEffects {
            gasSummary {
              computationCost
              storageCost
              storageRebate
            }
          }
          events(first: 50) {
            pageInfo {
              hasNextPage
            }
            nodes {
              contents {
                type {
                  repr
                }
                json
              }
            }
          }
        }
        gasInput {
          gasBudget
          gasPrice
        }
        kind {
          __typename
          ... on ProgrammableTransaction {
            inputs(first: 50) {
              pageInfo {
                hasNextPage
              }
              nodes {
                __typename
                ... on Pure {
                  bytes
                }
                ... on MoveValue {
                  bcs
                }
                ... on SharedInput {
                  address
                }
              }
            }
            commands(first: 50) {
              pageInfo {
                hasNextPage
              }
              nodes {
                __typename
                ... on MoveCallCommand {
                  function {
                    name
                  }
                  arguments {
                    __typename
                    ... on Input {
                      ix
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
