sinclude .env
include ./deploy.mk
include ./data.mk

ETH=["69","84","72"]
BTC=["66","84","67"]
FEED_IDS=[$(ETH),$(BTC)]

CURRENT_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

CORE_ID_TXT=$(DEPLOY_DIR)/core_id.txt
ADAPTER_ID_TXT=$(DEPLOY_DIR)/adapter_id.txt
CORE_ID=$(shell cat $(CORE_ID_TXT) 2>/dev/null)
ADAPTER_ID=$(shell cat $(ADAPTER_ID_TXT) 2>/dev/null)
EXERCISE_RESULT=[.transaction.events[] | .ExercisedEvent // empty][0].exerciseResult

get-prices-core: prepare_data get-core-id-by-interface get-token
	@TEMPLATE_ID="$(ICORE_TEMPLATE_ID)" \
	CONTRACT_ID="$(CORE_ID)" \
	CHOICE=GetPrices \
	CHOICE_ARG='{ \
		"caller": "$(PARTY_VIEWER)", \
		"feedIds": $(FEED_IDS), \
		"currentTime": "$(CURRENT_TIME)", \
		"payloadHex": "$(PAYLOAD)"}' \
	ACT_AS='["$(PARTY_VIEWER)"]' \
	CMD_NAME=get-prices-core \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	JQ='$(EXERCISE_RESULT)' \
	./scripts/canton-cmd.sh

write-prices: prepare_data get-adapter-id-by-interface get-token
	@TEMPLATE_ID="$(IADAPTER_TEMPLATE_ID)" \
	CONTRACT_ID="$(ADAPTER_ID)" \
	CHOICE=WritePrices \
	CHOICE_ARG='{ \
		"caller": "$(PARTY_UPDATER)", \
		"feedIds": $(FEED_IDS), \
		"currentTime": "$(CURRENT_TIME)", \
		"payloadHex": "$(PAYLOAD)", \
		"context": {"additionalPillViewers": [], "paidTrafficCost": "0"}}' \
	DISCLOSED_CONTRACTS='[{"synchronizerId": "global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a","contractId": "00deaaad88568938379d75d095961036688c49cca81efa596de41f578fe1ac1c2fca121220a86ed774b5e19df71fe79139d3fbb08e603db71977437cd997c7e1771efab2cc", "templateId": "3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.Amulet:FeaturedAppRight", \
                                 "createdEventBlob": "CgMyLjES7QQKRQDeqq2IVok4N5110JWWEDZojEnMqB76WW3kH1eP4awcL8oSEiCobtd0teGd9x/nkTnT+7COYD23GXdDfNmXx+F3HvqyzBINc3BsaWNlLWFtdWxldBpkCkAzY2ExMzQzYWIyNmI0NTNkMzhjOGFkYjcwZGNhNWYxZWFkODQ0MGM0MmI1OWI2OGYwNzA3ODY5NTVjYmY5ZWMxEgZTcGxpY2USBkFtdWxldBoQRmVhdHVyZWRBcHBSaWdodCLCAWq/AQpNCks6SURTTzo6MTIyMGJlNThjMjllNjVkZTQwYmYyNzNiZTFkYzJiMjY2ZDQzYTlhMDAyZWE1YjE4OTU1YWVlZjdhYWM4ODFiYjQ3MWEKbgpsOmo4YjQzOTliYS1jNDAxLTRhOTctYTFmZS01OTA3N2E4YjNiMTQ6OjEyMjBhMDI0Mjc5N2E4NGUxZDhjNDkyZjEyNTliM2Y4N2Q1NjFmY2JkZTJlNGIyY2ViYzQ1NzJkZGZjNTE1YjQ0YzI4KklEU086OjEyMjBiZTU4YzI5ZTY1ZGU0MGJmMjczYmUxZGMyYjI2NmQ0M2E5YTAwMmVhNWIxODk1NWFlZWY3YWFjODgxYmI0NzFhMmo4YjQzOTliYS1jNDAxLTRhOTctYTFmZS01OTA3N2E4YjNiMTQ6OjEyMjBhMDI0Mjc5N2E4NGUxZDhjNDkyZjEyNTliM2Y4N2Q1NjFmY2JkZTJlNGIyY2ViYzQ1NzJkZGZjNTE1YjQ0YzI4OaJKB7zfRwYAQioKJgokCAESIDbsB7rbjoydLFC0bpT+Y3ewtwAOap/7GeGh4zIhX0aUEB4="}]' \
	ACT_AS='["$(PARTY_UPDATER)"]' \
	CMD_NAME=write-prices \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	./scripts/canton-cmd.sh

get-prices: prepare_data get-adapter-id-by-interface get-token
	@TEMPLATE_ID="$(ICORE_TEMPLATE_ID)" \
	CONTRACT_ID="$(ADAPTER_ID)" \
	CHOICE=GetPrices \
	CHOICE_ARG='{ \
		"caller": "$(PARTY_VIEWER)", \
		"feedIds": $(FEED_IDS), \
		"currentTime": "$(CURRENT_TIME)", \
		"payloadHex": "$(PAYLOAD)"}' \
	ACT_AS='["$(PARTY_VIEWER)"]' \
	CMD_NAME=get-prices \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	JQ='$(EXERCISE_RESULT)' \
	./scripts/canton-cmd.sh

read-price-data: get-adapter-id-by-interface get-token
	@TEMPLATE_ID="$(IADAPTER_TEMPLATE_ID)" \
	CONTRACT_ID="$(ADAPTER_ID)" \
	CHOICE=ReadPriceData \
	CHOICE_ARG='{"caller": "$(PARTY_VIEWER)", "feedIds": $(FEED_IDS)}' \
	ACT_AS='["$(PARTY_VIEWER)"]' \
	CMD_NAME=read-price-data \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	JQ='$(EXERCISE_RESULT)' \
	./scripts/canton-cmd.sh

update-factory-id: get-adapter-id-by-interface get-token
	TEMPLATE_ID="$(ADAPTER_TEMPLATE_ID)" \
	CONTRACT_ID="$(ADAPTER_ID)" \
	CHOICE=UpdatePillFactory \
	CHOICE_ARG='{"newPillFactory": "$(FACTORY_ID)"}' \
	ACT_AS='["$(PARTY_OWNER)"]' \
	CMD_NAME=update-pill-factory \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	./scripts/canton-cmd.sh

update-reward-factory-id: get-adapter-id-by-interface get-token
	TEMPLATE_ID="$(ADAPTER_TEMPLATE_ID)" \
	CONTRACT_ID="$(ADAPTER_ID)" \
	CHOICE=UpdateRewardFactory \
	CHOICE_ARG='{"newRewardFactory": "$(REWARD_FACTORY_ID)"}' \
	ACT_AS='["$(PARTY_OWNER)"]' \
	CMD_NAME=update-reward-factory \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	./scripts/canton-cmd.sh

unlink-all-pills: get-adapter-id-by-interface get-token
	TEMPLATE_ID="$(ADAPTER_TEMPLATE_ID)" \
	CONTRACT_ID="$(ADAPTER_ID)" \
	CHOICE=UnlinkAllPills \
	ACT_AS='["$(PARTY_OWNER)"]' \
	CMD_NAME=unlink-all-pills \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	./scripts/canton-cmd.sh

ACT_AS?="$(PARTY_OWNER)"

check-archive-args:
	@test -n "$(TEMPLATE_ID)" || (echo "Set TEMPLATE_ID=<packageId>:<Module>:<Template>" >&2 && exit 1)
	@test -n "$(CONTRACT_ID)" || (echo "Set CONTRACT_ID=<contractId to archive>" >&2 && exit 1)

archive-contract: check-archive-args check-party-suffix get-token
	@echo "Archiving $(CONTRACT_ID) of $(TEMPLATE_ID)" >&2
	@TEMPLATE_ID="$(TEMPLATE_ID)" \
	CONTRACT_ID="$(CONTRACT_ID)" \
	CHOICE=Archive \
	ACT_AS='[$(ACT_AS)]' \
	CMD_NAME=archive-contract \
	CANTON_API="$(CANTON_API)" \
	TOKEN="$(TOKEN)" \
	./scripts/canton-cmd.sh

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
	  }' | jq -r '.[].contractEntry.JsActiveContract.createdEvent | select(.createArgument.coreId == "$(CORE_NAME)") | .contractId'); \
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
