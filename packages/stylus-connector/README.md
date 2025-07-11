# RedStone Stylus connector


### Prepare environment

1. Copy `.env.example` as `.env` file
2. Run

```shell
make -C stylus/price-adapter set-up-env 
```

### Deploy contract

1. Put a `PRIVATE_KEY` with an existing non-zero `SepoliaETH` balance on Arbitrum Sepolia into `.env` file
2. Run `make -C stylus/price-adapter deploy`
3. Put the `CONTRACT_ADDRESS` (in the case below: `0x386b9b171a9db7521a22e17e90ac29890c684ab4`) from the output into `.env` file

```shell
...
wasm data fee: 0.000137 ETH (originally 0.000114 ETH with 20% bump)
checking whether the contract has a constructor...
deployed code at address: 0x386b9b171a9db7521a22e17e90ac29890c684ab4
deployment tx hash: 0x9403ad07e254d1831b656920d06fb14a5d415f20273d2b9f1af8ca0db4981671
contract activated and ready onchain with tx hash: 0xe1d9d0837d33599a7caf3df2dc3dc5c57b5027599f1ea12853987801ba9a380b
...
```

### Sample Run

1. Run

```shell
yarn sample-run
```

* To read the current data in contract (can be empty at the beginning)
* To write the latest available RedStone data
* To read the data in the contract again (should be the latest)
