# RedStone CLI

RedStone CLI is a tool that helps to deploy all necessary contracts for the [RedStone Push Model](https://docs.redstone.finance/docs/get-started/models/redstone-push/) and run the relayer responsible for pushing prices on-chain

## Instruction

#### 1. Install RedStone CLI with yarn, npm, pnpm or other package manager in the separate folder (there will be a few files autogenerated)

```bash
yarn add @redstone-finance/cli
```

#### 2. Run initialization script which will prepare files for CLI and run it afterwards

```bash
npx redstone-cli init
```

#### 3. Contracts deploying can be done right after initialization or later by running the command below to start CLI

```bash
npx redstone-cli
```

#### 4. Deploy [RedStone Multi-feed Adapter contract](https://docs.redstone.finance/docs/get-started/models/redstone-push/#contracts) responsible for storing and updating prices on-chain by selecting `Deploy multi-feed adapter` option in the CLI menu. Then pass proper values for parameters which will be displayed

| Param             | Description                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Network name      | Network name on which contract will be deployed, also basic name for all files autogenerated (needs to be used the same through whole process) |
| Network RPC URL   | RPC URL used to deploy contract                                                                                                                |
| Proxy Admin Owner | Wallet Address that will be used to run contract upgrade (contracts are deployed behind a proxy to make them upgradable)                       |
| Private key       | Wallet private key used for deployment                                                                                                         |

#### 5. After the Multi-feed Adapter, you must deploy [Price Feeds contracts](https://docs.redstone.finance/docs/get-started/models/redstone-push/#contracts) which are interfaces to read prices for a specific token. **This step also populates the manifest for the relayer and is required to make the whole deployment work**. To do this, start the CLI once again by running the command below and selecting the `Deploy price feeds` option in the CLI menu. Then pass proper values for the parameters that will be displayed

```bash
npx redstone-cli
```

| Param           | Description                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Network name    | Network name on which contract will be deployed, also basic name for all files autogenerated (needs to be used the same through whole process) |
| Network RPC URL | RPC URL used to deploy contract                                                                                                                |
| Feeds to deploy | Tokens for which you would like to deploy price feed contracts and push prices on-chain, comma-separated e.g. ETH,BTC                          |
| Private key     | Wallet private key used for deployment                                                                                                         |

#### 6. When Multi-feed Adapter and Price Feeds contracts are deployed start the [relayer](https://docs.redstone.finance/docs/get-started/models/redstone-push/#relayer) by running CLI using the command below and select the `Run relayer` option in the CLI menu. Then pass proper values for parameters which will be displayed. Relayer will run straight away in the same process as CLI. Currently default update conditions are **deviation - 0.5%, heartbeat - 6h**, adjusting them will come in the next release

```bash
npx redstone-cli
```

| Param                                              | Optionality | Default value | Description                                                                                                                                                                                |
| -------------------------------------------------- | :---------: | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Network name                                       |  required   |               | Network name on which contract will be deployed, also basic name for all files autogenerated (needs to be used the same through whole process)                                             |
| Network RPC URL                                    |  required   |               | RPC URLs used to send update transactions, can be multiple to increase robustness, comma-separated e.g. https://rpc-url-1.com,https://rpc-url-2.com                                        |
| Relayer iteration interval                         |  optional   | 5000          | Time interval in which the relayer tries to update prices if update conditions are met                                                                                                     |
| Expected transaction delivery time in milliseconds |  optional   | 5000          | Time in which it is expected that valid transaction can be mined, typically 2x avg block time                                                                                              |
| Are fees two dimensional                           |  optional   | yes           | Yes if network has two dimensional fees (like Arbitrum or ZKSync based networks), more info [here](https://medium.com/offchainlabs/understanding-arbitrum-2-dimensional-fees-fd1d582596c9) |
| Gas limit for update transaction                   |  optional   | 750000        | Gas limit used for update transaction                                                                                                                                                      |
| Private key                                        |  required   |               | Wallet private key used for updating prices on-chain                                                                                                                                       |
