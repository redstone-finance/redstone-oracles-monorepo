DATA_DIR=../../sdk/scripts/payload-generator
DATA_NAME=stellar
DATA_CAT=$(shell cat ${DATA_DIR}/data/${DATA_NAME}.hex)
FEED_ID=BTC
FEED_IDS="$(FEED_ID)", "ETH"

WASM_TARGET=wasm32v1-none
CONTRACT=redstone_adapter

NETWORK=testnet
ACCOUNT=stellar
ADAPTER_ID=

install:
	rustup target add $(WASM_TARGET)

account:
	stellar keys generate --global $(ACCOUNT) --network $(NETWORK) --fund

build: install
	stellar contract build

test:
	cargo test

deploy: build
	stellar contract deploy \
	  --wasm target/$(WASM_TARGET)/release/$(CONTRACT).wasm \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --alias $(CONTRACT)

write_prices: prepare_data
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  write_prices \
	  --feed_ids '[ $(FEED_IDS) ]' \
	  --payload $(DATA_CAT)

get_prices: prepare_data
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  get_prices \
	  --feed_ids '[ $(FEED_IDS) ]' \
	  --payload $(DATA_CAT)

read_prices:
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  read_prices \
	  --feed_ids '[ $(FEED_IDS) ]'

read_timestamp:
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  read_timestamp \
	  --feed_id $(FEED_ID)

read_price_data:
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  read_price_data \
	  --feed_ids '[ $(FEED_IDS) ]'

prepare_data:
	make -C $(DATA_DIR) DATA_NAME=$(DATA_NAME) prepare_data
