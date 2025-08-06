# Redstone oracle chain-agnostic tests

Unified tests configuration that should be used to test each new RedStone Oracles implementation (e.g. Non-EVM chains).

The test cases are defined in this package, so it should be enough to write an engine to run all of them, minimising code duplication.

Examples of engines:
- packages/evm-connector/test/chain-agnostic/chain-agnostic.test.ts
- packages/on-chain-relayer/test/contracts/chain-agnostic/chain-agnostic.test.ts

## Principles for the test engines
- Connect as close as possible to the real contract instance that will be deployed on a blockchain
- If some tests are difficult (impossible) to connect, don't skip them. Instead, think about the **minimal** required updates in the chain-agnostic-oracle-tests package to support these test cases in your connector
- Add chain-agnostic tests to CI
- Do mutation testing in your tests engine (e.g. switch expectedSuccess to !expectedSuccess and verify if all tests fail)
