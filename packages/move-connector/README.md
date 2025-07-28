# move-connector

## Prelude

Dedicated URL for testnet needs this custom URL: "https://aptos.testnet.bardock.movementlabs.xyz/v1"
Custom URL is preferred over testnet default as testnet isn't available yet.
Use `custom` network type and provide above custom URL for tests with testnet.

### Deploying and testing

[Install aptos cli](https://aptos.dev/en/build/cli) - Compile the version 3.5.0 of movement CLI or use `make install-cli`.
[Setup localnet](https://aptos.dev/en/build/cli/running-a-local-network)

Ensure you have the move account config in `move/.movement/config.yaml`.
If not, please initiate configuration with `movement init --skip-faucet` in `move` directory.

Run deploy:

- PACKAGE_ADDRESS env variable must be in a hex format and indicates on chain package address.
  It is optional parameter, if not specified then `.movement/config.yaml` account address is used.
  For example: `0x744ea1316e136548403df153b72ac5df49621907a882b5dddf886b1b51b8eef2` is a valid package address.
- PRIVATE_KEY is a private key of `secp256k1` type and must be provided in hex format.
  It is optional parameter, if not specified then `.movement/config.yaml` private key is used.

All hex strings can start with leading `0x` or without.

```sh
NETWORK=localnet yarn deploy
```

### Tests

To test MovementPricesContractAdapter i MovementPricesContractConnector follow the steps below.

* Start the node locally.

  ```sh
  movement node run-localnet --force-restart --assume-yes
  ```

* Prepare node for test deploying all the required contracts. You have to do it only once until your node is running.

  ```sh
  yarn prepare
  ```

* Run the test.

  ```sh
  yarn test
  ```

### Multisig

We use multisig flow implemented in the [multisig](https://github.com/movementlabsxyz/aptos-core/blob/movement/aptos-move/framework/aptos-framework/sources/multisig_account.move).

1. Create multisig on chain.
2. Propose transaction on the chain.
3. Participants of the multisig vote on the proposed transaction.
4. If threshold is met, anyone can execute the transaction on the chain.

See [MultiSigTxBuilder.ts](scripts/ledger/MultiSigTxBuilder.ts) for implementation in the typescript of the multisig transactions.

### Deployments

We adopted the object-code-deployment model, see [object-code-deployment](https://aptos.dev/en/build/smart-contracts/deployment) and [deploy-script](./scripts/deploy.ts).
