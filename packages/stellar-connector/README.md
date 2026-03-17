# 🔗 @redstone-finance/stellar-connector

[![Discord](https://img.shields.io/discord/786251205008949258?logo=discord)](https://discord.gg/2CT6hN6C)
[![Twitter](https://img.shields.io/twitter/follow/redstone_defi?style=flat&logo=twitter)](https://twitter.com/intent/follow?screen_name=redstone_defi)

Proudly supported by:
[![Stellar Grant Program](stellar-grant-program.png)](#-the-stellar-grant-program)

RedStone proposes a completely new modular design where data is first put into a data availability layer and then
fetched on-chain. This allows us to broadcast a large number of assets at high frequency to a cheaper layer and put it
on-chain only when required by the protocol.

The `@redstone-finance/stellar-connector` module implements an alternative design of providing oracle data to smart
contracts. Instead of constantly persisting data on the Stellar network storage (by data providers), the information is
brought on-chain only when needed (by end users). Until that moment data remains in the decentralised cache layer, which
is powered by RedStone light cache gateways. Data is transferred to the Stellar
network by end users. The information integrity is verified on-chain through signature checking.

Here also you can find the description of
the [whole RedStone Oracle model](https://docs.redstone.finance/docs/introduction).

- [👨‍💻 Code structure](#-code-structure)
- [🔥 Connecting to the contract](#-connecting-to-the-contract)
- [⚡ The Stellar Grant Program](#-the-stellar-grant-program)
- [📄 License](#-license)

## 👨‍💻 Code structure

- [stellar](stellar) directory contains the stellar-network on-chain contracts.
  - You can read [here](stellar/contracts/README.md) how the contracts work.
    - The directory contains a dependency to the [RedStone Rust-SDK library](https://github.com/redstone-finance/rust-sdk/tree/main/crates/redstone),
      containing aggregation as well as full data-processing written in Rust
      - There are also various tests of signature verification with the given signers, timestamp validation, value
        aggregation as well as full data-processing tests with various configurations.
  - [test](stellar/contracts/redstone-adapter/src/test) directory contains various integration and unit tests
    of contracts having their WASM-compiled code.
- [src](src) directory contains the TypeScript classes, useful for establishing a connection between TypeScript and
  stellar-network layers.
  - See [below](#-connecting-to-the-contract), how to connect to the contract.
- [test](test) directory contains the TypeScript SDK tests

## 🔥 Connecting to the contract

First, you need to import the adapter code to your project

```ts
// Typescript
import {
  StellarWriteContractAdapter,
  StellarClientBuilder,
  makeKeypair,
} from "@redstone-finance/stellar-connector";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";

// Javascript
const {
  StellarWriteContractAdapter,
  StellarClientBuilder,
  makeKeypair,
} = require("@redstone-finance/stellar-connector");
const { ContractParamsProvider, getSignersForDataServiceId } = require("@redstone-finance/sdk");
```

Then you can invoke the contract methods described above pointing to the
selected [RedStone data service](https://app.redstone.finance) and requested data feeds.

```ts
const client = new StellarClientBuilder()
  .withStellarNetwork("testnet")
  .withRpcUrl("https://soroban-testnet.stellar.org")
  .build();

const keypair = makeKeypair();
const adapter = new StellarWriteContractAdapter(client, yourContractAddress, keypair);

const paramsProvider = new ContractParamsProvider({
  dataServiceId: "redstone-primary-prod",
  uniqueSignersCount: 1,
  dataPackagesIds: ["ETH", "BTC"],
  authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
});
```

Now you can access any of the contract's methods by invoking the code:

```ts
const feedId = paramsProvider.getDataFeedIds()[0];

await adapter.getPricesFromPayload(paramsProvider);
await adapter.writePricesFromPayloadToContract(paramsProvider);
await adapter.readPricesFromContract(paramsProvider);
await adapter.readTimestampFromContract(feedId);
```

### Installing the dependencies

```bash
yarn install
```

## ⚡ The Stellar Grant Program

The Stellar Development Foundation offers grants and funding to projects building on and contributing
to the growth of both the Stellar network and Soroban, Stellar’s native smart contracts platform.
Explore their grants and award programs [here](https://stellar.org/grants-and-funding/).

## 📄 License

RedStone Stellar connector is an open-source and free software released under the BUSL-1.1 License.
