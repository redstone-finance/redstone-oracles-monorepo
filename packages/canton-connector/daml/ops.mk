sinclude ../.env
include ./intellect.mk
include ./data.mk

ETH=["69","84","72"]
BTC=["66","84","67"]
FEED_IDS=[$(ETH),$(BTC)]

CURRENT_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
ADAPTER_ID=$(shell cat adapter_id.txt)

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
					"caller": "$(PARTY_VIEWER)", \
	      			"feedIds": $(FEED_IDS), \
	      			"currentTime": "$(CURRENT_TIME)", \
					"payloadHex": "$(PAYLOAD)"}}}], \
	    "actAs": ["$(PARTY_VIEWER)"], \
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
					"caller": "$(PARTY_UPDATER)", \
	      			"feedIds": $(FEED_IDS), \
	      			"currentTime": "$(CURRENT_TIME)", \
					"payloadHex": "$(PAYLOAD)"}}}], \
	    "actAs": ["$(PARTY_UPDATER)"], \
		"commandId": "write-prices-$(shell date +%s)"}' | jq '.'

get-prices: prepare_data get-adapter-id-by-interface get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(ICORE_TEMPLATE_ID)", \
	    		"contractId": "$(ADAPTER_ID)", \
	    		"choice": "GetPrices", \
				"choiceArgument": { \
					"caller": "$(PARTY_VIEWER)", \
	      			"feedIds": $(FEED_IDS), \
	      			"currentTime": "$(CURRENT_TIME)", \
					"payloadHex": "$(PAYLOAD)"}}}], \
	    "actAs": ["$(PARTY_VIEWER)"], \
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
					"caller": "$(PARTY_VIEWER)", \
	      			"feedIds": $(FEED_IDS)}}}], \
	    "actAs": ["$(PARTY_VIEWER)"], \
		"commandId": "read-price-data-$(shell date +%s)"}' | jq '.transactionTree.eventsById.["0"].ExercisedTreeEvent.value.exerciseResult'

update-factory-id: get-adapter-id-by-interface get-token
	curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(ADAPTER_TEMPLATE_ID)", \
	    		"contractId": "$(ADAPTER_ID)", \
	    		"choice": "UpdatePillFactory", \
				"choiceArgument": { \
					"newPillFactory": "$(FACTORY_ID)"}}}], \
	    "actAs": ["$(PARTY_OWNER)"], \
		"commandId": "update-pill-factory-$(shell date +%s)"}' | jq '.'

update-reward-factory-id: get-adapter-id-by-interface get-token
	curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(ADAPTER_TEMPLATE_ID)", \
	    		"contractId": "$(ADAPTER_ID)", \
	    		"choice": "UpdateRewardFactory", \
				"choiceArgument": { \
					"newRewardFactory": "$(REWARD_FACTORY_ID)"}}}], \
	    "actAs": ["$(PARTY_OWNER)"], \
		"commandId": "update-reward-factory-$(shell date +%s)"}' | jq '.'

unlink-all-pills: get-adapter-id-by-interface get-token
	curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(ADAPTER_TEMPLATE_ID)", \
	    		"contractId": "$(ADAPTER_ID)", \
	    		"choice": "UnlinkAllPills", \
				"choiceArgument": {}}}], \
	    "actAs": ["$(PARTY_OWNER)"], \
		"commandId": "unlink-all-pills-$(shell date +%s)"}' | jq '.'
