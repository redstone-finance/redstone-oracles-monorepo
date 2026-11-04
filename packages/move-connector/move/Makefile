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
APTOS_CLI_VERSION=9.6.0
APTOS_CLI_ZIP=aptos-cli-$(APTOS_CLI_VERSION)-macOS-$(shell uname -m).zip
APTOS_CLI_SHA256_arm64=8b59fcd0ea768a173c5b90c299b6d6f53a9052e91160a98a465416f7330eecc5
APTOS_CLI_SHA256_x86_64=1cc8e173cb4ed45f1365b5d79e83026bd007fd49ae7f74246b4238983ba73d35

install-cli:
	curl -fLO https://github.com/movementlabsxyz/homebrew-movement-cli/releases/download/bypass-homebrew/movement-cli-l1-macos-x86_64.tar.gz
	echo "76ccb07b2e77106c110548720bab2e0fb9ed5b7e348e287231af2ea50388fb02  movement-cli-l1-macos-x86_64.tar.gz" | shasum -a 256 -c -
	mkdir -p temp_extract
	tar -xzf movement-cli-l1-macos-x86_64.tar.gz -C temp_extract
	chmod +x temp_extract/movement
	sudo mv temp_extract/movement /usr/local/bin/movement
	rm -rf temp_extract
	rm movement-cli-l1-macos-x86_64.tar.gz
	curl -fLO https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v$(APTOS_CLI_VERSION)/$(APTOS_CLI_ZIP)
	echo "$(APTOS_CLI_SHA256_$(shell uname -m))  $(APTOS_CLI_ZIP)" | shasum -a 256 -c -
	unzip -o $(APTOS_CLI_ZIP) aptos -d temp_extract
	sudo mv temp_extract/aptos /usr/local/bin/aptos
	rm -rf temp_extract
	rm $(APTOS_CLI_ZIP)

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
