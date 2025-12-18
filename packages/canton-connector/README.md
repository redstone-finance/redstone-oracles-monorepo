# 🔗 @redstone-finance/canton-connector

[![Discord](https://img.shields.io/discord/786251205008949258?logo=discord)](https://discord.gg/2CT6hN6C)
[![Twitter](https://img.shields.io/twitter/follow/redstone_defi?style=flat&logo=twitter)](https://twitter.com/intent/follow?screen_name=redstone_defi)

RedStone proposes a completely new modular design where data is first put into a data availability layer and then
fetched on-chain. This allows us to broadcast a large number of assets at high frequency to a cheaper layer and put it
on-chain only when required by the protocol.

The `@redstone-finance/canton-connector` module implements an alternative design of providing oracle data to smart
contracts. Instead of constantly persisting data on the Canton network storage (by data providers), the information is
brought on-chain only when needed (by end users). Until that moment data remains in the decentralised cache layer, which
is powered by RedStone light cache gateways. The information integrity is verified on-chain through signature checking.

Here also you can find the description of
the [whole RedStone Oracle model](https://docs.redstone.finance/docs/introduction).

- [👨‍💻 Code structure](#-code-structure)
- [🔥 Connecting to the contract](#-connecting-to-the-contract)
- [📄 License](#-license)

## 👨‍💻 Code structure

- [daml](daml) directory contains the canton-network on-chain contracts.
  - You can read [here](daml/README.md) how the contracts work.
- [src](src) directory contains the TypeScript classes, useful for establishing a connection between TypeScript and
  canton-network layers.
  - See [below](#-connecting-to-the-contract), how to connect to the contract.

## 🔥 Connecting to the contract

### Pull model

First, you need to import the connector code to your project

```ts
// Typescript
import {
  PriceAdapterCantonContractConnector,
  makeCantonConnection,
} from "@redstone-finance/canton-connector";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";

// Javascript
const {
  CoreCantonContractAdapter,
  keycloakTokenProvider,
} = require("@redstone-finance/canton-connector");
const { ContractParamsProvider, getSignersForDataServiceId } = require("@redstone-finance/sdk");
```

Then you can invoke the contract methods described above pointing to the
selected [RedStone data service](https://app.redstone.finance/app/pull-model/redstone-primary-prod) and requested data feeds.

```ts
 // use tokenProvider you want; for keycloakTokenProvider you need the ENV variable defined as in '.env.example'
const tokenProvider = () => keycloakTokenProvider();

// The party ID you'll be using to interact with the contract; one of defined during contract's initialization
const partyId = `RedStoneOracleViewer:1220a0242797a84e1d8c492f1259b3f87d561fcbde2e4b2cebc4572ddfc515b44c28`;

// The coreId defined during contract's initialization; NOT THE contractId - it will be fetched automatically by package ids
const coreId = "RedStoneAdapter-040";

// RedStone Canton Client; Needs to have the `PARTICIPANT` env variable defined
const client = new CantonClient(partyId, getJsonApiUrl(), tokenProvider); 

const adapter = new CoreCantonContractAdapter(client, coreId);
const paramsProvider = new ContractParamsProvider({
  dataPackagesIds: ["ETH", "BTC"],
  dataServiceId: "redstone-primary-prod",
  uniqueSignersCount: 3,
  authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
});
```
Now you can decode the prices by invoking the code:

```ts
await adapter.getPricesFromPayload(paramsProvider);
```

### Installing the dependencies

```bash
yarn install
```

## 📄 License

RedStone Canton connector is an open-source and free software released under the BUSL-1.1 License.
