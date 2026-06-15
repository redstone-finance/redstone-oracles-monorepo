import { graphql } from "@mysten/sui/graphql/schema";

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
              nonRefundableStorageFee
            }
          }
          events {
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
            inputs {
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
            commands {
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
