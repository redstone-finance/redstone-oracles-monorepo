PRICE_ADAPTER=price_adapter
PRICE_FEED=price_feed
PRICE_RELAY_ADAPTER=price_relay_adapter

PRICE_ADAPTER_ADDRESS=$(shell cat "./$(CONTRACTS_DIR)/$(PRICE_ADAPTER)/DEPLOYED.hex")
PRICE_FEED_ADDRESS=$(shell cat "./$(CONTRACTS_DIR)/$(PRICE_FEED)/DEPLOYED.hex")
PRICE_RELAY_ADAPTER_ADDRESS=$(shell cat "./$(CONTRACTS_DIR)/$(PRICE_RELAY_ADAPTER)/DEPLOYED.hex")

BTC=4346947
ETH=4543560
