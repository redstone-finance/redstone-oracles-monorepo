# solana-connector

## Deploying and testing

### Requirements
Before use, you will need:
* rust
* solana-cli
* anchor-cli
* node

### Tools versions
* anchor-cli 0.30.1
* solana-cli 2.1.4 (src:024d047e; feat:288566304, client:Agave)
* npm 10.9.0
* node v18.20.5

All installation steps are described [here](https://solana.com/docs/intro/installation#install-dependencies)

### Build and run contract tests

```sh
cd solana
make build
make lint
make test
```

### Run deployment

Fill envs in file .env. See .env.example for reference.

```sh
NETWORK=localnet yarn sample-deploy
NETWORK=localnet yarn sample-run
```


### Upgrading program

1. Create buffer with new program-data
2. Transfer ownership of buffer to multisig
3. Upgrade program to use the new buffer

```sh
solana program write-buffer <PROGRAM_FILEPATH> 
# > Buffer: BUFFER_ADDRESS
solana account <BUFFER_ADDRESS> # shows data of the new buffer account
solana program set-buffer-authority <BUFFER_ADDRESS> --new-buffer-authority <NEW_BUFFER_AUTHORITY> # NEW_BUFFER_AUTHORITY = Multisig Vault Pda
yarn gov-as-multi-sig # multi sig upgrade procedure
```
