sinclude ../.env
include ./deploy.mk
include ./data.mk

ETH=["69","84","72"]
BTC=["66","84","67"]
FEED_IDS=[$(ETH),$(BTC)]

CURRENT_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

CORE_ID_TXT=core_id.txt
ADAPTER_ID_TXT=adapter_id.txt
CORE_ID=$(shell cat $(CORE_ID_TXT))
ADAPTER_ID=$(shell cat $(ADAPTER_ID_TXT))

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

archive: get-token
	curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"ExerciseCommand": { \
	    		"templateId": "$(REWARD_FACTORY_TEMPLATE_ID)", \
	    		"contractId": "0061bc5ae1e86c1c9d498ff5c965d9a6b998a5d7711114300e8f383e94040d11fbca1212201368ed9cdf8c0a105c1c0c9e92abbe05caad2a452e8a56ebd4baf9f9a79c619d", \
	    		"choice": "Archive", \
				"choiceArgument": {}}}], \
	    "actAs": ["$(PARTY_OWNER)","$(PARTY_BENEFICIARY)"], \
		"commandId": "archive-$(shell date +%s)"}' | jq '.'

get-adapter-id: get-token
	@LEDGER_END=$$(curl -s -X GET \
	  -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/state/ledger-end" | jq -r '.offset'); \
	CONTRACT_ID=$$(curl -s -X POST \
	  -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/state/active-contracts" \
	  -d '{ \
	    "filter": { \
	      "filtersByParty": { \
	        "$(PARTY_OWNER)": { \
	          "cumulative": [{ \
	            "identifierFilter": { \
	              "TemplateFilter": { \
	                "value": { \
	                  "templateId": "$(ADAPTER_TEMPLATE_ID)", \
	                  "includeCreatedEventBlob": true \
	                } \
	              } \
	            } \
	          }] \
	        } \
	      } \
	    }, \
	    "activeAtOffset": '"$$LEDGER_END"' \
	  }' | jq -r '.[].contractEntry.JsActiveContract.createdEvent | select(.createArgument.adapterId == "$(ADAPTER_NAME)") | .contractId'); \
	echo "$$CONTRACT_ID" > $(ADAPTER_ID_TXT); \
	echo "Adapter ID saved: $$CONTRACT_ID at offset $$LEDGER_END"

get-core-id-by-interface: get-token
	@LEDGER_END=$$(curl -s -X GET \
	  -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/state/ledger-end" | jq -r '.offset'); \
	CONTRACT_ID=$$(curl -s -X POST \
	  -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/state/active-contracts" \
	  -d '{ \
	    "filter": { \
	      "filtersByParty": { \
	        "$(PARTY_VIEWER)": { \
	          "cumulative": [{ \
	            "identifierFilter": { \
	              "InterfaceFilter": { \
	                "value": { \
	                  "interfaceId": "$(ICORE_TEMPLATE_ID)", \
	                  "includeInterfaceView": true, \
	                  "includeCreatedEventBlob": false \
	                } \
	              } \
	            } \
	          }] \
	        } \
	      } \
	    }, \
	    "activeAtOffset": '"$$LEDGER_END"' \
	  }' | jq -r '.[].contractEntry.JsActiveContract.createdEvent | select(.createArgument.coreId == "$(ADAPTER_NAME)") | .contractId'); \
	echo "$$CONTRACT_ID" > $(CORE_ID_TXT); \
	echo "Core ID saved: $$CONTRACT_ID at offset $$LEDGER_END"

get-adapter-id-by-interface: get-token
	@LEDGER_END=$$(curl -s -X GET \
	  -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/state/ledger-end" | jq -r '.offset'); \
	CONTRACT_ID=$$(curl -s -X POST \
	  -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/state/active-contracts" \
	  -d '{ \
	    "filter": { \
	      "filtersByParty": { \
	        "$(PARTY_OWNER)": { \
	          "cumulative": [{ \
	            "identifierFilter": { \
	              "InterfaceFilter": { \
	                "value": { \
	                  "interfaceId": "$(IADAPTER_TEMPLATE_ID)", \
	                  "includeInterfaceView": true, \
	                  "includeCreatedEventBlob": false \
	                } \
	              } \
	            } \
	          }] \
	        } \
	      } \
	    }, \
	    "activeAtOffset": '"$$LEDGER_END"' \
	  }' | jq -r '.[].contractEntry.JsActiveContract.createdEvent | select(.createArgument.adapterId == "$(ADAPTER_NAME)") | .contractId'); \
	echo "$$CONTRACT_ID" > $(ADAPTER_ID_TXT); \
	echo "Adapter ID saved: $$CONTRACT_ID at offset $$LEDGER_END"
