# @redstone-finance/solana-connection

Solana RPC connection layer shared by RedStone connectors and fetchers: `SolanaConnectionBuilder` (multi-executor
`Connection`), `RedStoneConnection` + request collectors, `network-ids` and cluster helpers. Contains no contract
logic — that lives in `@redstone-finance/solana-connector`.
