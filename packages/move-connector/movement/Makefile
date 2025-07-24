DATA_GENERATOR=../../../packages/sdk/scripts/payload-generator
DATA_DIR=$(DATA_GENERATOR)/data
PUBLIC_KEY=movement config show-profiles --profile default | jq .Result.default.account
ADAPTER_ADDRESS=$(shell cat deployments/custom-price_adapter-addresses.json | jq .contractAddress)
FEED_ADDRESS=$(shell cat deployments/custom-price_feed-addresses.json | jq .contractAddress)
ADAPTER_OBJECT_ADDRESS=$(shell cat deployments/custom-price_adapter-addresses.json | jq .objectAddress)
FEED_ETH=0x4554480000000000000000000000000000000000000000000000000000000000
FEED_BTC=0x4254430000000000000000000000000000000000000000000000000000000000

# ignored so clean will always run
.IGNORE: install-movement clean prepare-cli update-aptos-core-deps

prepare-cli:
	git clone https://github.com/movementlabsxyz/aptos-core.git
	cd aptos-core && git checkout movement-cli-v3.5.0

update-aptos-core-deps:
	@echo "Updating Cargo.toml to use specific version instead of revision."
	@cd aptos-core && \
	sed -i '' 's|tonic = { git = "https://github.com/aptos-labs/tonic.git", rev = "0da1ba8b1751d6e19eb55be24cccf9ae933c666e" }|tonic = { git = "https://github.com/aptos-labs/tonic.git" }|' Cargo.toml

install-movement:
	@echo "Installing movement-cli with cargo install."
	@cd aptos-core && \
	cargo install --locked --bin movement --path crates/aptos --profile cli

clean:
	rm -rf aptos-core

install-cli: prepare-cli update-aptos-core-deps install-movement clean

init-movement:
	movement init --skip-faucet

default-public-key:
	$(PUBLIC_KEY)

adapter-address:
	$(ADAPTER_ADDRESS)

fmt:
	aptos move fmt --package-path contracts/redstone_sdk
	aptos move fmt --package-path contracts/price_adapter
	aptos move fmt --package-path contracts/price_feed

test:
	movement move test --package-dir contracts/redstone_sdk
	movement move test --package-dir contracts/price_adapter
	movement move test --package-dir contracts/price_feed


build:
	movement move build --package-dir contracts/redstone_sdk --dev
	movement move build --package-dir contracts/price_adapter --dev
	movement move build --package-dir contracts/price_feed --dev

deploy-price-adapter:
	movement move publish --package-dir contracts/redstone_sdk --named-addresses redstone_sdk=default
	movement move publish --package-dir contracts/price_adapter --named-addresses redstone_price_adapter=default,redstone_sdk=default

deploy-price-feed:
	movement move publish --package-dir contracts/price_feed --named-addresses redstone_price_adapter=default,price_feed=default,price_adapter_object_address=$(ADAPTER_ADDRESS),redstone_sdk=default

prepare-data:
	make -C $(DATA_GENERATOR) DATA_NAME=$(DATA_NAME) prepare_data

data: prepare-data
	cat $(DATA_DIR)/$(DATA_NAME).hex

write-sample-data: prepare-data
	movement move run --function-id "$(ADAPTER_ADDRESS)::price_adapter::write_price" --args "address:$(ADAPTER_OBJECT_ADDRESS)" "hex:0x4554480000000000000000000000000000000000000000000000000000000000" "hex:$(shell cat $(DATA_DIR)/$(DATA_NAME).hex)"

write-sample-data-multi: prepare-data
	movement move run --function-id "$(ADAPTER_ADDRESS)::price_adapter::write_prices" --args "address:$(ADAPTER_OBJECT_ADDRESS)" 'hex:["$(FEED_ETH)", "$(FEED_BTC)"]' "hex:$(shell cat $(DATA_DIR)/$(DATA_NAME).hex)"

read-price:
	movement move view --function-id $(FEED_ADDRESS)::price_feed::read_price

read-price-timestamp:
	movement move view --function-id $(FEED_ADDRESS)::price_feed::read_price_and_timestamp

read-timestamp:
	movement move view --function-id $(FEED_ADDRESS)::price_feed::read_timestamp
