![1080x360](https://user-images.githubusercontent.com/48165439/198347984-c69b1606-e6c6-460d-b3e8-d03694345faa.jpeg)

# RedStone Oracles Monorepo

Monorepo containing all the main components of the RedStone oracles ecosystem.

## 💡 RedStone ecosystem

RedStone is a data ecosystem that delivers frequently updated, reliable and
diverse data for your dApp and smart contracts.

It uses a radically different way of putting data on-chain. The data is automatically attached to a user's transaction
and erased afterwards thus reducing gas fees without touching the expensive evm storage.

You can learn more at https://docs.redstone.finance

## 📦 Packages

- [oracle-node](packages/oracle-node/) (Reference implementation of the data provider node)
- [cache-service](packages/cache-service/) (Implementation of the redstone cache nodes)
- [evm-connector](packages/evm-connector/) (@redstone-finance/evm-connector)
- [protocol](packages/protocol/) (@redstone-finance/protocol)
- [sdk](packages/sdk/) (@redstone-finance/sdk)
- [eth-contracts](packages/eth-contracts/) (Implementation of RedStone token with vesting, locking, and disputes
  resolution protocol)

## Configure development environment

- install nvm `brew install nvm` and select node 22 `nvm use 22`
- enable corepack feature of node `corepack enable`
- install dependencies `yarn`
- build everything `yarn build:all`

We use Turborepo to run monorepo tasks efficiently. For more info, see our [Turborepo cheatsheet](./TURBO.md).

## 🙋‍♂️ Contact

Please feel free to contact us on [Discord](https://redstone.finance/discord) or email to core@redstone.finance.

## 📜 Licesnse

BUSL-1.1
