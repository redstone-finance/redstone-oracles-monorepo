DATA_DIR=../../sdk/scripts/payload-generator
DATA_NAME=stellar
DATA_CAT=$(shell cat ${DATA_DIR}/data/${DATA_NAME}.hex)
FEED_ID=BTC
FEED_IDS="$(FEED_ID)", "ETH"

WASM_TARGET=wasm32v1-none
CONTRACT=redstone_adapter
NIGHTLY=nightly-2025-04-29

NETWORK=testnet
ACCOUNT=stellar
ADAPTER_ID=

.PHONY: fmt check test build clippy build all-checks

setup-env:
	rustup target add $(WASM_TARGET)
	rustup toolchain install $(NIGHTLY) --component rustfmt,clippy
	cargo install cargo-machete --version 0.8.0 --locked

unused-deps:
	cargo machete --with-metadata

fix-unused-deps:
	cargo machete --fix

fmt:
	cargo +$(NIGHTLY) fmt --all

check:
	cargo +$(NIGHTLY) fmt --all --check

clippy:
	cargo clippy --all-targets --all-features -- --no-deps -D warnings

test:
	cargo test --all-targets --all-features

all-checks: check clippy test build unused-deps

fix-all: fmt fix-unused-deps all-checks

account:
	stellar keys generate --global $(ACCOUNT) --network $(NETWORK) --fund

build: setup-env
	stellar contract build

deploy: build
	adapter_id=`stellar contract deploy \
	  --wasm target/$(WASM_TARGET)/release/$(CONTRACT).wasm \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --alias $(CONTRACT)` && \
	stellar contract invoke \
	  --id $${adapter_id} \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  init \
	  --admin $(ACCOUNT) && \
	echo "ADAPTER_ID: $${adapter_id}"

upgrade: build
	hash=`stellar contract upload \
	  --wasm target/$(WASM_TARGET)/release/$(CONTRACT).wasm \
	  --source $(ACCOUNT) \
	  --network $(NETWORK)` && \
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  upgrade \
	  --new_wasm_hash $${hash}

check_version:
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  version

write_prices: prepare_data
	stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  write_prices \
	  --updater `stellar keys address $(ACCOUNT)` \
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
