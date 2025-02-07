# movement-connector

### Deploying and testing

[Install aptos cli](https://aptos.dev/en/build/cli) - Compile the version 3.5.0 of movement CLI.
[Setup localnet](https://aptos.dev/en/build/cli/running-a-local-network)

Run deploy:

```sh
NETWORK=localnet SKIP_FAUCET=true PRIVATE_KEY=... yarn deploy # this will create object_ids.json file used by other scripts. It will be only valid on localnet!
```

Tests:

```sh
NETWORK=localnet yarn test
NETWORK=localnet yarn sample-run
```

### Multisig

We use multisig flow implemented in the [multisig](https://github.com/movementlabsxyz/aptos-core/blob/movement/aptos-move/framework/aptos-framework/sources/multisig_account.move).

1. Create multisig on chain.
2. Propose transaction on the chain.
3. Participants of the multisig vote on the proposed transaction.
4. If threshold is met, anyone can execute the transaction on the chain.

See [multisig.ts](./scripts/multisig.ts) for implementation in the typescript of the multisig transactions.

### Deployements
We addopted the object-code-deployment model, see [object-code-deployment](https://aptos.dev/en/build/smart-contracts/deployment) and [deploy-script](./scripts/deploy.ts).
