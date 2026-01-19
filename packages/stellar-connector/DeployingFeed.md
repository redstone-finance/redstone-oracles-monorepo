# Deploying Price Feed for stellar

Use the `packages/stellar-connector` package.
Build the code, using `yarn build:turbo`

## Environment

```dotenv
RPC_URL="https://mainnet.sorobanrpc.com"
PRIVATE_KEY=
NETWORK=mainnet
DEPLOY_DIR=./deployments/stellarMultiFeed
```

1. The private key here can be any 256-bit hex string, because stellar uses the Ed25519-curve.
2. To achieve of the account the private key is associated to, use `yarn get-stellar-address`,
   having put the key to the env.
3. The return address, like `G…` is the address you should send the `XLM` to,
   as described in [stellar-zrodelko](https://wiki.redstone.vip/docs/guidelines/swapping-crypto#stellar-zrodelko)
4. Cost of instantiating one feed is `~0.05 XLM`

## Deploying process

The contract-code won't be uploaded, but just instantiated of the code uploaded and verified before.

1. Put the `PRICE_FEED_ID` symbol to the env as above
    ```dotenv
    PRICE_FEED_ID=XYZ
    ```
2. Run `yarn instantiate-price-feed`
3. The script ends with:
    ```text
    🚀 price feed for XYZ contract deployed at: C…
    ✅ Id saved to deployments/stellarMultiFeed/redstone_price_feed-XYZ-id.mainnet
    ```
4. The `C…` is the address of the feed. The value is also saved to a file inside the `deployments` dir.
5. Do not forget to commit the file containing the address to the repository.
6. Check the created contract on: https://stellar.expert. Sth like below should be visible there at the bottom of the page:

```text
G… invoked contract C… init(GCXY…LUFY, "XYZ"str)
G… created contract C… from WASM code …
```
