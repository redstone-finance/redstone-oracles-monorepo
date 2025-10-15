DATA_GENERATOR=../../../packages/sdk/scripts/payload-generator
DATA_DIR=$(DATA_GENERATOR)/data
PUBLIC_KEY=movement config show-profiles --profile default | jq .Result.default.account
ADAPTER_ADDRESS=$(shell cat deployments/custom-price_adapter-addresses.json | jq .contractAddress)
FEED_ADDRESS=$(shell cat deployments/custom-price_feed-addresses.json | jq .contractAddress)
ADAPTER_OBJECT_ADDRESS=$(shell cat deployments/custom-price_adapter-addresses.json | jq .objectAddress)
FEED_ETH=0x4554480000000000000000000000000000000000000000000000000000000000
FEED_BTC=0x4254430000000000000000000000000000000000000000000000000000000000
BUILDER=aptos#or movement
DIR=contracts

install-cli:
	curl -LO https://github.com/movementlabsxyz/homebrew-movement-cli/releases/download/bypass-homebrew/movement-macos-arm64.tar.gz
	tar -xzf movement-macos-arm64.tar.gz
	rm movement-macos-arm64.tar.gz
	chmod +x movement
	sudo mv movement /usr/local/bin/movement
	brew install aptos

init-movement:
	movement init --skip-faucet

default-public-key:
	$(PUBLIC_KEY)

adapter-address:
	$(ADAPTER_ADDRESS)

fmt:
	$(BUILDER) move fmt --package-path ${DIR}/redstone_sdk
	$(BUILDER) move fmt --package-path ${DIR}/price_adapter
	$(BUILDER) move fmt --package-path ${DIR}/price_feed

test:
	$(BUILDER) move test --package-dir ${DIR}/redstone_sdk
	$(BUILDER) move test --package-dir ${DIR}/price_adapter
	$(BUILDER) move test --package-dir ${DIR}/price_feed

build:
	$(BUILDER) move build --package-dir ${DIR}/redstone_sdk --dev
	$(BUILDER) move build --package-dir ${DIR}/price_adapter --dev
	$(BUILDER) move build --package-dir ${DIR}/price_feed --dev

# This target only downloads dependencies without building the packages
download-dependencies:
	$(BUILDER) move compile --fetch-deps-only --package-dir ${DIR}/redstone_sdk --dev
	$(BUILDER) move compile --fetch-deps-only --package-dir ${DIR}/price_adapter --dev
	$(BUILDER) move compile --fetch-deps-only --package-dir ${DIR}/price_feed --dev

deploy-price-adapter:
	$(BUILDER) move publish --package-dir ${DIR}/redstone_sdk --named-addresses redstone_sdk=default
	$(BUILDER) move publish --package-dir ${DIR}/price_adapter --named-addresses redstone_price_adapter=default,redstone_sdk=default

deploy-price-feed:
	$(BUILDER) move publish --package-dir ${DIR}/price_feed --named-addresses redstone_price_adapter=default,price_feed=default,price_adapter_object_address=$(ADAPTER_ADDRESS),redstone_sdk=default

prepare-data:
	make -C $(DATA_GENERATOR) DATA_NAME=$(DATA_NAME) prepare_data

data: prepare-data
	cat $(DATA_DIR)/$(DATA_NAME).hex

write-sample-data: prepare-data
	$(BUILDER) move run --function-id "$(ADAPTER_ADDRESS)::price_adapter::write_price" --args "address:$(ADAPTER_OBJECT_ADDRESS)" "hex:0x4554480000000000000000000000000000000000000000000000000000000000" "hex:$(shell cat $(DATA_DIR)/$(DATA_NAME).hex)"

write-sample-data-multi: prepare-data
	$(BUILDER) move run --function-id "$(ADAPTER_ADDRESS)::price_adapter::write_prices" --args "address:$(ADAPTER_OBJECT_ADDRESS)" 'hex:["$(FEED_ETH)", "$(FEED_BTC)"]' "hex:$(shell cat $(DATA_DIR)/$(DATA_NAME).hex)"

read-price:
	$(BUILDER) move view --function-id $(FEED_ADDRESS)::price_feed::read_price

read-price-timestamp:
	$(BUILDER) move view --function-id $(FEED_ADDRESS)::price_feed::read_price_and_timestamp

read-timestamp:
	$(BUILDER) move view --function-id $(FEED_ADDRESS)::price_feed::read_timestamp
