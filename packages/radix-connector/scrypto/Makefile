-include ../.env
PRICE_ADAPTER=price_adapter
PRICE_FEED=price_feed
PROXY=proxy
BADGE_CREATOR=badge_creator
DEPLOYMENT_DIR ?= .

CONTRACT ?= $(PRICE_ADAPTER)

CONTRACTS := $(PRICE_ADAPTER) $(PRICE_FEED) $(PROXY) $(BADGE_CREATOR)
CONTRACTS_DIR=$(DEPLOYMENT_DIR)/contracts
CONTRACT_DIR=$(CONTRACTS_DIR)/$(CONTRACT)
DEPLOYED_DIR=$(CONTRACT_DIR)/deployed
PACKAGE_ADDRESS=$(shell cat $(DEPLOYED_DIR)/package.resim.addr)
COMPONENT_ADDRESS=$(shell cat $(DEPLOYED_DIR)/component.resim.addr)
PRICE_ADAPTER_ADDRESS=$(shell cat $(CONTRACTS_DIR)/$(PRICE_ADAPTER)/deployed/package.resim.addr)
PRICE_FEED_ADDRESS=$(shell cat $(CONTRACTS_DIR)/$(PRICE_FEED)/deployed/package.resim.addr)
PRICE_FEED_COMPONENT=$(shell cat $(CONTRACTS_DIR)/$(PRICE_FEED)/deployed/component.resim.addr)
PROXY_ADDRESS=$(shell cat $(CONTRACTS_DIR)/$(PROXY)/deployed/package.resim.addr)
PROXY_COMPONENT=$(shell cat $(CONTRACTS_DIR)/$(PROXY)/deployed/component.resim.addr)
BADGE_CREATOR_ADDRESS=$(shell cat $(CONTRACTS_DIR)/$(BADGE_CREATOR)/deployed/package.resim.addr)

ACCOUNT=$(shell resim show | sed -n 's/Component Address.*\(account_[a-zA-Z0-9]*\).*/\1/p')
OWNER_BADGE=$(shell resim show | sed -n 's/.*\(resource_[a-zA-Z0-9]*\).*: 1 Owner Badge/\1\:\#1\#/p')

CLIPPY=cargo clippy --release --fix --allow-dirty --allow-staged --allow-no-vcs

DATA_NAME=radix
DATA_DIR=../../sdk/scripts/payload-generator
DATA_CAT=$(shell cat ${DATA_DIR}/data/${DATA_NAME}.hex)
PAYLOAD=$(shell cat ./sample-data/payload.hex)
TIMESTAMP=$(shell cat $(DATA_DIR)/data/$(DATA_NAME).time | node-jq -r ".timestamp")

.PHONY:

prepare:
	@rustup target add wasm32-unknown-unknown
	cargo install wasm-bindgen-cli wasm-pack

build: $(foreach contract, $(CONTRACTS), build-$(contract))

build-%: prepare
	cargo build --package $*
	scrypto build --path $(CONTRACTS_DIR)/$*
	cp ./target/wasm32-unknown-unknown/release/$*.rpd $(CONTRACTS_DIR)/$*/artifacts/
	cp ./target/wasm32-unknown-unknown/release/$*_with_schema.wasm $(CONTRACTS_DIR)/$*/artifacts/

publish: $(foreach contract, $(CONTRACTS), publish-$(contract))

publish-%: clippy
	resim publish $(CONTRACTS_DIR)/$* | tee | grep -o 'package_[a-zA-Z0-9]*' > $(CONTRACTS_DIR)/$*/deployed/package.resim.addr

instantiate-%:
	resim run $(TMF_PATH) > output.tmp
	cat output.tmp | grep -o 'component_[a-zA-Z0-9]*' | tail -n 1 > $(DEPLOYED_DIR)/component.resim.addr
	cat output.tmp | grep -o 'resource_[a-zA-Z0-9]*' | tail -n 1 > $(DEPLOYED_DIR)/owner.resim.addr
	rm output.tmp

deploy-%: publish
	make instantiate-$*

call-%:
	resim call-method $(COMPONENT_ADDRESS) $* $(ARGS) $(PROOFS)

test: clippy
	@for contract in $(CONTRACTS); do \
		cargo test --package  $$contract; \
	done

clippy: prepare
	@for contract in $(CONTRACTS); do \
		$(CLIPPY) --package $$contract; \
	done

check-lint: clippy
	cargo fmt -- --check

lint: clippy
	cargo fmt

get_data:
	make -C $(DATA_DIR) DATA_NAME=$(DATA_NAME) prepare_data

prepare_data: get_data
	printf "${DATA_CAT}" > ./sample-data/payload.hex

update_data: prepare_data
	resim set-current-time "$(shell date -u +'%Y-%m-%dT%H:%M:%SZ')"

deploy_adapter: publish-price_adapter
	make instantiate-PriceAdapter TMF_PATH=$(CONTRACTS_DIR)/$(PRICE_ADAPTER)/manifests/instantiate_with_mock_time.rtm ACCOUNT=$(ACCOUNT) PRICE_ADAPTER_ADDRESS=$(PACKAGE_ADDRESS) MOCK_TIME=1740569340u64

deploy_feed: publish-price_feed
	make instantiate-PriceFeed TMF_PATH=./$(CONTRACTS_DIR)/$(PRICE_FEED)/manifests/instantiate.rtm DEPLOYED_DIR=$(CONTRACTS_DIR)/$(PRICE_FEED)/deployed/ ACCOUNT=$(ACCOUNT) PRICE_FEED=$(PRICE_FEED_ADDRESS) PRICE_ADAPTER_COMPONENT_ADDRESS=$(COMPONENT_ADDRESS)

deploy_proxy: publish-proxy
	ACCOUNT=$(ACCOUNT) PACKAGE_ADDRESS=$(PROXY_ADDRESS) OWNER_BADGE="$(OWNER_BADGE)" MANAGER_BADGE="$(OWNER_BADGE)" resim run $(CONTRACTS_DIR)/proxy/manifests/instantiate.rtm > output.tmp
	cat output.tmp | grep -o 'component_[a-zA-Z0-9]*' | tail -n 1 > $(CONTRACTS_DIR)/$(PROXY)/deployed/component.resim.addr
	cat output.tmp | grep -o 'resource_[a-zA-Z0-9]*' | tail -n 1 > $(CONTRACTS_DIR)/$(PROXY)/deployed/owner.resim.addr
	rm output.tmp

set_contract_address:
	resim call-method $(PROXY_COMPONENT) set_contract_global_address $(PRICE_FEED_COMPONENT)  --proofs $(OWNER_BADGE)

get_prices:
	make call-get_prices ARGS="ETH,BTC $(PAYLOAD)" | sed -n '/Outputs:/,/Balance Changes:/p' | sed '/Balance Changes:/d'

write_prices:
	ACCOUNT=$(ACCOUNT) COMPONENT_ADDRESS=$(COMPONENT_ADDRESS) PAYLOAD=$(PAYLOAD) resim run $(CONTRACTS_DIR)/$(PRICE_ADAPTER)/manifests/write_prices.rtm

read_prices:
	ACCOUNT=$(ACCOUNT) COMPONENT_ADDRESS=$(COMPONENT_ADDRESS) resim run $(CONTRACTS_DIR)/$(PRICE_ADAPTER)/manifests/read_prices.rtm  | sed -n '/Outputs:/,/Balance Changes:/p' | sed '/Balance Changes:/d'

read_timestamp:
	ACCOUNT=$(ACCOUNT) COMPONENT_ADDRESS=$(COMPONENT_ADDRESS) resim run $(CONTRACTS_DIR)/$(PRICE_ADAPTER)/manifests/read_timestamp.rtm | sed -n '/Outputs:/,/Balance Changes:/p' | sed '/Balance Changes:/d'

read_price_and_timestamp:
	ACCOUNT=$(ACCOUNT) COMPONENT_ADDRESS=$(COMPONENT_ADDRESS) resim run $(CONTRACTS_DIR)/$(PRICE_ADAPTER)/manifests/read_price_and_timestamp.rtm | sed -n '/Outputs:/,/Balance Changes:/p' | sed '/Balance Changes:/d'

read_price_and_timestamp_proxy:
	ACCOUNT=$(ACCOUNT) PROXY_ADDRESS=$(PROXY_COMPONENT) resim run $(CONTRACTS_DIR)/$(PROXY)/manifests/read_price_and_timestamp.rtm  | sed -n '/Outputs:/,/Balance Changes:/p' | sed '/Balance Changes:/d'

show:
	resim show

create_badges: publish
	resim call-function $(BADGE_CREATOR_ADDRESS) "BadgeCreator" create_badges
