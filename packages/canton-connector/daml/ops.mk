sinclude ../.env
include ./intellect.mk
include ./data.mk

FEED_IDS=[$(ETH),$(BTC)]
PARTY_UPDATER="RedStoneOracleUpdater::$(PARTY_SUFFIX)"
PARTY_READER="RedStoneOracleViewer::$(PARTY_SUFFIX)"
CURRENT_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

get-prices-core: prepare_data get-core-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(ICORE_TEMPLATE_ID)", \
	    		"contractId": "$(CORE_ID)", \
	    		"choice": "GetPrices", \
				"choiceArgument": { \
	      			"feedIds": $(FEED_IDS), \
	      			"currentTime": "$(CURRENT_TIME)", \
					"payloadHex": "$(PAYLOAD)"}}}], \
	    "actAs": [$(PARTY_READER)], \
		"commandId": "get-prices-core-$(shell date +%s)"}' | jq '.transactionTree.eventsById.["0"].ExercisedTreeEvent.value.exerciseResult'

write-prices: prepare_data get-adapter-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(IADAPTER_TEMPLATE_ID)", \
	    		"contractId": "$(ADAPTER_ID)", \
	    		"choice": "WritePrices", \
				"choiceArgument": { \
	      			"feedIds": $(FEED_IDS), \
	      			"currentTime": "$(CURRENT_TIME)", \
					"payloadHex": "$(PAYLOAD)"}}}], \
	    "actAs": [$(PARTY_UPDATER)], \
		"commandId": "write-prices-$(shell date +%s)"}' | jq '.'

get-prices: prepare_data get-adapter-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(IADAPTER_TEMPLATE_ID)", \
	    		"contractId": "$(ADAPTER_ID)", \
	    		"choice": "GetPrices", \
				"choiceArgument": { \
	      			"feedIds": $(FEED_IDS), \
	      			"currentTime": "$(CURRENT_TIME)", \
					"payloadHex": "$(PAYLOAD)"}}}], \
	    "actAs": [$(PARTY_READER)], \
		"commandId": "get-prices-$(shell date +%s)"}' | jq '.transactionTree.eventsById.["0"].ExercisedTreeEvent.value.exerciseResult'

read-price-data: get-adapter-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(IADAPTER_TEMPLATE_ID)", \
	    		"contractId": "$(ADAPTER_ID)", \
	    		"choice": "ReadPriceData", \
				"choiceArgument": { \
	      			"feedIds": $(FEED_IDS)}}}], \
	    "actAs": [$(PARTY_READER)], \
		"commandId": "read-price-data-$(shell date +%s)"}' | jq '.transactionTree.eventsById.["0"].ExercisedTreeEvent.value.exerciseResult'

read-data: get-adapter-id-by-interface get-price-feed-id-by-interface get-token
	curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(IPRICE_FEED_TEMPLATE_ID)", \
	    		"contractId": "$(PRICE_FEED_ID)", \
	    		"choice": "ReadData", \
				"choiceArgument": { \
	      			"adapterCid": "$(ADAPTER_ID)"}}}], \
	    "actAs": [$(PARTY_READER)], \
		"commandId": "read-data-$(shell date +%s)"}' | jq '.transactionTree.eventsById.["0"].ExercisedTreeEvent.value.exerciseResult'
