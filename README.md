

<p align="center">
  <img src="https://user-images.githubusercontent.com/48165439/198347984-c69b1606-e6c6-460d-b3e8-d03694345faa.jpeg" alt="RedStone Oracles Banner">
</p>

<h1 align="center">🔴 RedStone Oracles Monorepo</h1>

<p align="center">
  <strong>Next-generation decentralized oracles for smart contracts</strong>
</p>

<div align="center">

[![GitHub Repo stars](https://img.shields.io/github/stars/redstone-finance/redstone-oracles-monorepo?logo=github&color=yellow)](https://github.com/redstone-finance/redstone-oracles-monorepo/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/redstone-finance/redstone-oracles-monorepo?logo=github&color=blue)](https://github.com/redstone-finance/redstone-oracles-monorepo/network/members)
[![GitHub last commit](https://img.shields.io/github/last-commit/redstone-finance/redstone-oracles-monorepo?logo=git)](https://github.com/redstone-finance/redstone-oracles-monorepo/commits/main)
[![License](https://img.shields.io/badge/license-BUSL--1.1-green.svg)](LICENSE)

</div>

---

## 🌟 **About RedStone Oracles**
RedStone provides **fast, reliable, and cost-efficient** oracles for decentralized applications (dApps) and smart contracts.  

🔹 **Gas-efficient**: Data is attached to transactions and erased afterward, avoiding expensive storage costs.  
🔹 **Flexible integration**: Works with multiple blockchain ecosystems and execution layers.  
🔹 **Decentralized & secure**: Ensuring data integrity with advanced validation mechanisms.  

📖 **Learn more**: [RedStone Documentation](https://docs.redstone.finance)

---

## 📦 **Packages in Monorepo**
This repository contains all core components of the **RedStone Oracle ecosystem**.

| Package | Description |
|---------|------------|
| [`oracle-node`](packages/oracle-node/) | Reference implementation of the **data provider node** |
| [`cache-service`](packages/cache-service/) | Implementation of **RedStone cache nodes** |
| [`evm-connector`](packages/evm-connector/) | **EVM Connector** package (`@redstone-finance/evm-connector`) |
| [`protocol`](packages/protocol/) | Core protocol package (`@redstone-finance/protocol`) |
| [`sdk`](packages/sdk/) | Developer SDK for easy integration (`@redstone-finance/sdk`) |
| [`oracles-smartweave-contracts`](packages/oracles-smartweave-contracts/) | SmartWeave contracts (`@redstone-finance/oracles-smartweave-contracts`) |
| [`eth-contracts`](packages/eth-contracts/) | RedStone **token contracts**, vesting, locking & dispute resolution |

---

## 🚀 **Getting Started**
To set up and run RedStone Oracles locally, follow these steps:

### **1️⃣ Clone the Repository**
```sh
git clone https://github.com/redstone-finance/redstone-oracles.git
cd redstone-oracles
```

### **2️⃣ Install Dependencies**
We use **pnpm** as our package manager. Install it first if not already installed.
```sh
npm install -g pnpm
pnpm install
```

### **3️⃣ Build the Project**
```sh
pnpm build
```

### **4️⃣ Run Oracle Node**
```sh
pnpm start
```

📌 **Note**: Ensure you have the required environment variables configured before running.

---

## 💡 **Contributing**
We welcome contributions from the community!  

🔹 If you'd like to contribute, please check out our [Contribution Guide](CONTRIBUTING.md).  
🔹 Before submitting a PR, make sure to run tests and linting checks.

```sh
pnpm test
pnpm lint
```

---

## 📬 **Get in Touch**
Join our growing community and stay updated with the latest developments!

<p align="left">
  <a href="https://discord.com/invite/redstonedefi">
    <img src="https://img.shields.io/badge/Discord-5865F2?logo=discord&logoColor=white&style=for-the-badge" alt="Discord">
  </a>
  <a href="https://twitter.com/redstone_defi">
    <img src="https://img.shields.io/badge/Twitter-000000?logo=x&logoColor=white&style=for-the-badge" alt="Twitter (X)">
  </a>
  <a href="mailto:core@redstone.finance">
    <img src="https://img.shields.io/badge/Email-core@redstone.finance-red?style=for-the-badge" alt="Email">
  </a>
</p>

---

## 📜 **License**
This project is licensed under **Business Source License 1.1 (BUSL-1.1)**.  
See [LICENSE](LICENSE) for full details.

---

### 🚀 **RedStone - Powering the Next-Generation DeFi & Web3 Applications**
🔗 **Website**: [redstone.finance](https://redstone.finance)  
📖 **Docs**: [docs.redstone.finance](https://docs.redstone.finance)  
