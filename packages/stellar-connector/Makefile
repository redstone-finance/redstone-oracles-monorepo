sinclude .env
export

DATA_DIR=../sdk/scripts/payload-generator
DATA_NAME=stellar
DATA_CAT=$(shell cat ${DATA_DIR}/data/${DATA_NAME}.hex)

FEED_ID=BTC
FEED_IDS="$(FEED_ID)", "ETH"
ACCOUNT=stellar
ADAPTER_ID=CB373ZHZJ75K34RCEEHGTSWKRR53ROJVO6DROQODGIZ5DLQEJZLEWDDC

DEPLOY_DIR ?= "stellar"

WASM_TARGET=wasm32v1-none
ADAPTER_CONTRACT=redstone_adapter
PRICE_FEED_CONTRACT=redstone_price_feed
NIGHTLY=nightly-2025-04-29

.PHONY: fmt check test build clippy build all-checks

setup-env:
	cd $(DEPLOY_DIR) && rustup target add $(WASM_TARGET)
	cd $(DEPLOY_DIR) && rustup toolchain install $(NIGHTLY) --component rustfmt,clippy
	cd $(DEPLOY_DIR) && cargo install cargo-machete --version 0.8.0 --locked

unused-deps:
	cargo machete --with-metadata

fix-unused-deps:
	cd $(DEPLOY_DIR) && cargo machete --fix

fmt:
	cd $(DEPLOY_DIR) && cargo +$(NIGHTLY) fmt --all

check:
	cd $(DEPLOY_DIR) && cargo +$(NIGHTLY) fmt --all --check

clippy:
	cd $(DEPLOY_DIR) && cargo clippy --all-targets --all-features -- --no-deps -D warnings

test:
	cd $(DEPLOY_DIR) && cargo test --all-targets # --all-features

all-checks: check clippy test build unused-deps

fix-all: fmt fix-unused-deps all-checks

account:
	stellar keys generate --global $(ACCOUNT) --network $(NETWORK) --fund

build: setup-env
	cd $(DEPLOY_DIR) && stellar contract build
	cd $(DEPLOY_DIR) && stellar contract optimize \
		--wasm target/$(WASM_TARGET)/release/$(ADAPTER_CONTRACT).wasm \
		--wasm-out target/$(WASM_TARGET)/release/$(ADAPTER_CONTRACT).wasm
	cd $(DEPLOY_DIR) && stellar contract optimize \
		--wasm target/$(WASM_TARGET)/release/$(PRICE_FEED_CONTRACT).wasm \
		--wasm-out target/$(WASM_TARGET)/release/$(PRICE_FEED_CONTRACT).wasm

build-test: setup-env
	cd $(DEPLOY_DIR) && stellar contract build --features agnostic-tests --out-dir target/agnostic-tests
	cd $(DEPLOY_DIR) && stellar contract optimize \
		--wasm target/agnostic-tests/$(ADAPTER_CONTRACT).wasm \
		--wasm-out target/agnostic-tests/$(ADAPTER_CONTRACT).wasm

deploy: build
	cd $(DEPLOY_DIR) && adapter_id=`stellar contract deploy \
	  --wasm target/$(WASM_TARGET)/release/$(ADAPTER_CONTRACT).wasm \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --alias $(ADAPTER_CONTRACT)` && \
	stellar contract invoke \
	  --id $${adapter_id} \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  init \
	  --owner $(ACCOUNT) && \
	echo "ADAPTER_ID: $${adapter_id}"

upgrade: build
	cd $(DEPLOY_DIR) && hash=`stellar contract upload \
	  --wasm target/$(WASM_TARGET)/release/$(ADAPTER_CONTRACT).wasm \
	  --source $(ACCOUNT) \
	  --network $(NETWORK)` && \
	cd $(DEPLOY_DIR) && stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  upgrade \
	  --new_wasm_hash $${hash}

write_prices: prepare_data
	cd $(DEPLOY_DIR) && stellar contract invoke \
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
	cd $(DEPLOY_DIR) && stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  get_prices \
	  --feed_ids '[ $(FEED_IDS) ]' \
	  --payload $(DATA_CAT)

read_prices:
	cd $(DEPLOY_DIR) && stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  read_prices \
	  --feed_ids '[ $(FEED_IDS) ]'

read_timestamp:
	cd $(DEPLOY_DIR) && stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  read_timestamp \
	  --feed_id $(FEED_ID)

read_price_data:
	cd $(DEPLOY_DIR) && stellar contract invoke \
	  --id $(ADAPTER_ID) \
	  --source $(ACCOUNT) \
	  --network $(NETWORK) \
	  --cost \
	  -- \
	  read_price_data \
	  --feed_ids '[ $(FEED_IDS) ]'

set-adapter-address:
	@if [ -z "$(ADDRESS)" ]; then \
		echo "ADDRESS not set"; \
		exit 1; \
	fi
	@sed 's/ADAPTER_ADDRESS: &str = "[^"]*"/ADAPTER_ADDRESS: \&str = "$(ADDRESS)"/' \
		$(DEPLOY_DIR)/contracts/redstone-price-feed/src/config.rs \
		> $(DEPLOY_DIR)/contracts/redstone-price-feed/src/config.rs.tmp
	@mv $(DEPLOY_DIR)/contracts/redstone-price-feed/src/config.rs.tmp \
		$(DEPLOY_DIR)/contracts/redstone-price-feed/src/config.rs

prepare_data:
	make -C $(DATA_DIR) DATA_NAME=$(DATA_NAME) prepare_data

