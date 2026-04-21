sinclude ../.env

CANTON_API=$(PARTICIPANT)$(API_PATH)
PACKAGE_IDS=package-ids.json

ADAPTER_NAME=RedStoneAdapter-v17-0.4.0
ADAPTER_TEMPLATE_ID=$(shell jq -r '.templates.adapter' $(PACKAGE_IDS))

CORE_NAME=RedStoneCore-v17-0.4.0
CORE_TEMPLATE_ID=$(shell jq -r '.templates.core' $(PACKAGE_IDS))
CORE_CLIENT_TEMPLATE_ID=$(shell jq -r '.templates.core_client' $(PACKAGE_IDS))

FACTORY_NAME=RedStonePricePillFactory-v17-0.4.0
FACTORY_TEMPLATE_ID=$(shell jq -r '.templates.factory' $(PACKAGE_IDS))

FACTORY_ID=00dcf463a3ebbc003a95f06cb738fc4c70abdc760fa52d34da0beed3a2896559dcca12122055635c0eb3cf22584577261b921fc33afdd6ef5304301c39b903876f2c4b1af3

REWARD_FACTORY_NAME=RedStoneRewardFactory-v17-0.4.0
REWARD_FACTORY_TEMPLATE_ID=$(shell jq -r '.templates.reward_factory' $(PACKAGE_IDS))

REWARD_FACTORY_ID=0089c0c6c1fc974986d0f25f7189bf16ecc2daa2a3f55584e9522d60a5198415b9ca121220b3c2a04dfb026ba762ea444c6cffa631ac5ec72f9648eae1ab8c52f94abedd3a

IADAPTER_TEMPLATE_ID=$(shell jq -r '.interfaces.adapter' $(PACKAGE_IDS))
ICORE_TEMPLATE_ID=$(shell jq -r '.interfaces.core' $(PACKAGE_IDS))

BENEFICIARY=8b4399ba-c401-4a97-a1fe-59077a8b3b14
FEATURED_CID=00deaaad88568938379d75d095961036688c49cca81efa596de41f578fe1ac1c2fca121220a86ed774b5e19df71fe79139d3fbb08e603db71977437cd997c7e1771efab2cc

TOKEN=$(shell cat token.txt)
CORE_ID_TXT=core_id.txt
ADAPTER_ID_TXT=adapter_id.txt
PRICE_FEED_ID_TXT=price_feed_id.txt
CORE_ID=$(shell cat $(CORE_ID_TXT))
ADAPTER_ID=$(shell cat $(ADAPTER_ID_TXT))
PRICE_FEED_ID=$(shell cat $(PRICE_FEED_ID_TXT))

PARTY_UPDATER=RedStoneOracleUpdater::$(PARTY_SUFFIX)
PARTY_VIEWER=RedStoneOracleViewer::$(PARTY_SUFFIX)
PARTY_OWNER=RedStoneOracleOwner::$(PARTY_SUFFIX)
PARTY_CLIENT=Client::$(PARTY_SUFFIX)
PARTY_BENEFICIARY=$(BENEFICIARY)::$(PARTY_SUFFIX)

get-token:
	@test -n "$(KEYCLOAK_USERNAME)" || (echo "Set KEYCLOAK_USERNAME env variable" && exit 1)
	@test -n "$(KEYCLOAK_PASSWORD)" || (echo "Set KEYCLOAK_PASSWORD env variable" && exit 1)
	@echo "Getting fresh token from Keycloak..."
	@RESPONSE=$$(curl -s -X POST \
	  "$(KEYCLOAK_URL)/auth/realms/$(REALM)/protocol/openid-connect/token" \
	  -d "grant_type=password" \
	  -d "client_id=$(CLIENT_ID)" \
	  -d "username=$(KEYCLOAK_USERNAME)" \
	  -d "password=$(KEYCLOAK_PASSWORD)" \
	  ); \
	echo $$RESPONSE | jq -r '.access_token' > token.txt; \
	echo $$RESPONSE | jq -r '.refresh_token' > refresh_token.txt; \
	echo "Token saved to token.txt"

refresh-token:
	@echo "Refreshing token..."
	@RESPONSE=$$(curl -s -X POST \
	  "$(KEYCLOAK_URL)/auth/realms/$(REALM)/protocol/openid-connect/token" \
	  -H "Content-Type: application/x-www-form-urlencoded" \
	  -d "grant_type=refresh_token" \
	  -d "refresh_token=$$(cat refresh_token.txt)" \
	  -d "client_id=$(CLIENT_ID)" \
	  -d "scope=openid profile email"); \
	echo $$RESPONSE | jq -r '.access_token' > token.txt; \
	echo $$RESPONSE | jq -r '.refresh_token' > refresh_token.txt; \
	echo "Token refreshed"

test-api: get-token
	@curl -H "Authorization: Bearer $(TOKEN)" \
	  $(PARTICIPANT)/status?port=5002

list-parties: get-token
	@curl -H "Authorization: Bearer $(TOKEN)" \
	  "$(CANTON_API)/v2/parties" | jq '.'

deploy-core: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(CORE_TEMPLATE_ID)", \
				"createArguments": { \
					"coreId": "$(CORE_NAME)", \
					"owner": "$(PARTY_OWNER)", \
					"viewers": ["$(PARTY_VIEWER)"], \
					"shouldVerifyViewer": false, \
					"beneficiary": "$(PARTY_BENEFICIARY)", \
					"featuredCid": "$(FEATURED_CID)"}}}], \
		"actAs": ["$(PARTY_OWNER)","$(PARTY_BENEFICIARY)"], \
		"commandId": "deploy-core-$(shell date +%s)"}' | jq '.'

deploy-core-client: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(CORE_CLIENT_TEMPLATE_ID)", \
				"createArguments": { \
					"owner": "$(PARTY_OWNER)", \
					"viewers": ["Client::$(PARTY_SUFFIX)"]}}}], \
		"actAs": ["$(PARTY_OWNER)"], \
		"commandId": "deploy-core-client-$(shell date +%s)"}' | jq '.'

deploy-factory: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(FACTORY_TEMPLATE_ID)", \
				"createArguments": { \
					"factoryId": "$(FACTORY_NAME)", \
					"owner": "$(PARTY_OWNER)", \
					"creators": ["$(PARTY_UPDATER)"]}}}], \
		"actAs": ["$(PARTY_OWNER)"], \
		"commandId": "deploy-factory-$(shell date +%s)"}' | jq '.'

deploy-reward-factory: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(REWARD_FACTORY_TEMPLATE_ID)", \
				"createArguments": { \
					"factoryId": "$(REWARD_FACTORY_NAME)", \
					"owner": "$(PARTY_OWNER)", \
					"beneficiary": "$(PARTY_BENEFICIARY)", \
					"featuredCid": "$(FEATURED_CID)", \
					"creators": ["$(PARTY_UPDATER)","$(PARTY_VIEWER)"]}}}], \
		"actAs": ["$(PARTY_OWNER)", "$(PARTY_BENEFICIARY)"], \
		"commandId": "deploy-reward-factory-$(shell date +%s)"}' | jq '.'

deploy-adapter: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(ADAPTER_TEMPLATE_ID)", \
				"createArguments": { \
					"adapterId": "$(ADAPTER_NAME)", \
					"owner": "$(PARTY_OWNER)", \
					"updaters": ["$(PARTY_UPDATER)"], \
					"viewers": ["$(PARTY_VIEWER)"], \
					"pillFactory": "$(FACTORY_ID)", \
					"rewardFactory": "$(REWARD_FACTORY_ID)", \
					"rewardState": null, \
					"feedData": []}}}], \
		"actAs": ["$(PARTY_OWNER)"], \
		"commandId": "deploy-adapter-$(shell date +%s)"}' | jq '.'

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

get-contract-by-interface: get-token
	@LEDGER_END=$$(curl -s -X GET \
		-H "Authorization: Bearer $(TOKEN)" \
		-H "Content-Type: application/json" \
		"$(CANTON_API)/v2/state/ledger-end" | jq -r '.offset'); \
	curl -s -X POST \
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
										"includeCreatedEventBlob": true \
									} \
								} \
							} \
						}] \
					} \
				} \
			}, \
			"activeAtOffset": '"$$LEDGER_END"' \
		}' | jq -r '.'

get-active-contracts: get-token
	@LEDGER_END=$$(curl -s -X GET \
		-H "Authorization: Bearer $(TOKEN)" \
		-H "Content-Type: application/json" \
		"$(CANTON_API)/v2/state/ledger-end" | jq -r '.offset'); \
	curl -s -X POST \
		-H "Authorization: Bearer $(TOKEN)" \
		-H "Content-Type: application/json" \
		"$(CANTON_API)/v2/state/active-contracts?limit=200" \
		-d '{ \
			"filter": { \
				"filtersByParty": { \
					"$(PARTY_BENEFICIARY)": { \
						"cumulative": [ \
							{ \
							  "identifierFilter": { \
								 "WildcardFilter": { \
									"value": { \
									   "includeCreatedEventBlob": true \
									} \
								 } \
							  } \
					   }] \
					} \
				} \
			}, \
			"activeAtOffset": '"$$LEDGER_END"' \
		}' | jq -r '.'
