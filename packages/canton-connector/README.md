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

### Push model (Adapter + PricePill)

The adapter stores price data on-ledger and creates `PricePill` contracts for individual feed reads.

```ts
import { PricesCantonContractAdapter, CantonBlockchainService } from "@redstone-finance/canton-connector";
import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";

const ADAPTER_ID = "RedStoneAdapter-v11-0.4.0";

const client = makeDefaultClient("RedStoneOracleViewer");
const updateClient = makeDefaultClient("RedStoneOracleUpdater");

const adapter = new PricesCantonContractAdapter(client, updateClient, ADAPTER_ID);
const service = new CantonBlockchainService(client);

const paramsProvider = new ContractParamsProvider({
  dataPackagesIds: ["ETH", "BTC"],
  dataServiceId: "redstone-primary-prod",
  uniqueSignersCount: 3,
  authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
});

await sampleRun(paramsProvider, adapter, service);
```

### Pull model (Core)

The pull model processes data directly in the transaction without persisting it on-ledger.

```ts
import { CoreCantonContractAdapter } from "@redstone-finance/canton-connector";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";

const client = makeDefaultClient("RedStoneOracleViewer");
const coreId = "RedStoneCore-v11-0.4.0";

const adapter = new CoreCantonContractAdapter(client, coreId);
const paramsProvider = new ContractParamsProvider({
  dataPackagesIds: ["ETH", "BTC"],
  dataServiceId: "redstone-primary-prod",
  uniqueSignersCount: 3,
  authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
});

await adapter.getPricesFromPayload(paramsProvider);
```

### Reading individual price feeds (PricePill)

```ts
import { PricePillCantonContractConnector } from "@redstone-finance/canton-connector";

const client = makeDefaultClient("RedStoneOracleViewer");
const ADAPTER_ID = "RedStoneAdapter-v11-0.4.0";

const ethFeedConnector = new PricePillCantonContractConnector(client, ADAPTER_ID, "ETH");
const adapter = await ethFeedConnector.getAdapter();
const price = await adapter.readLatestRoundDetails();
```

### Installing the dependencies

```bash
yarn install
```

## 📄 License

RedStone Canton connector is an open-source and free software released under the BUSL-1.1 License.
