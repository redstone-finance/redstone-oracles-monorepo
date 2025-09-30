sinclude ./.env
include ./intellect.mk
include ./data.mk

FEED_IDS=[$(ETH),$(BTC)]
PARTY_WRITER="Bob"
PARTY_READER="Charlie"
CURRENT_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

write-prices: prepare_data get-adapter-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/exercise \
	  -d '{ \
	    "templateId": "$(IADAPTER_TEMPLATE_ID)", \
	    "contractId": "$(ADAPTER_ID)", \
	    "choice": "WritePrices", \
	    "argument": { \
	      "feedIds": $(FEED_IDS), \
	      "currentTime": "$(CURRENT_TIME)", \
		  "payloadHex": "$(PAYLOAD)" \
	    }, \
	    "actAs": [$(PARTY_WRITER)] \
	  }' | jq '.'
	  
get-prices: prepare_data get-adapter-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/exercise \
	  -d '{ \
	    "templateId": "$(IADAPTER_TEMPLATE_ID)", \
	    "contractId": "$(ADAPTER_ID)", \
	    "choice": "GetPrices", \
	    "argument": { \
	      "feedIds": $(FEED_IDS), \
	      "currentTime": "$(CURRENT_TIME)", \
		  "payloadHex": "$(PAYLOAD)" \
	    }, \
	    "actAs": [$(PARTY_READER)] \
	  }' | jq '.'

read-price-data: get-adapter-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/exercise \
	  -d '{ \
	    "templateId": "$(IADAPTER_TEMPLATE_ID)", \
	    "contractId": "$(ADAPTER_ID)", \
	    "choice": "ReadPriceData", \
	    "argument": { \
	      "feedIds": $(FEED_IDS) \
	    }, \
	    "actAs": [$(PARTY_READER)] \
	  }' | jq '.'

read-data: get-adapter-id-by-interface get-price-feed-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/exercise \
	  -d '{ \
	    "templateId": "$(IPRICE_FEED_TEMPLATE_ID)", \
	    "contractId": "$(PRICE_FEED_ID)", \
	    "choice": "ReadData", \
	    "argument": { \
	      "adapterCid": "$(ADAPTER_ID)" \
	    }, \
	    "actAs": [$(PARTY_READER)] \
	  }' | jq '.'
