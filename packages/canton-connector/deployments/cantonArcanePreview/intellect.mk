sinclude ../../.env

CANTON_API=$(PARTICIPANT)$(API_PATH)

ADAPTER_NAME=RedStoneAdapter-v12-0.4.0
ADAPTER_TEMPLATE_ID=4b09751144ad16495651812c12cba13aeacdff7750e232654c418bd975710968:RedStoneAdapter:RedStoneAdapter

CORE_NAME=RedStoneCore-v12-0.4.1
CORE_ID := 1c47e8e0c8ebd8e36a56f070c64e061b7544adb15f7a8eba4a88fa4c49502a46
CORE_TEMPLATE_ID := $(CORE_ID):RedStoneCore:RedStoneCore
CORE_CLIENT_TEMPLATE_ID := $(CORE_ID):RedStoneCoreClient:RedStoneCoreClient

FACTORY_NAME=RedStonePricePillFactory-v12-0.4.0
FACTORY_TEMPLATE_ID=86c358756961e573b2ef4a5d86cf7624aa86a334d6ee8bb8a916a12918def8e2:RedStonePricePillFactory:RedStonePricePillFactory

FACTORY_ID=004009c4c2190567b16a9ab97f1af51709586b6200de2920870b31ce3db03d4345ca121220446e7ebda2e5afe4e1970e18abdaf9c9321db0cb0e78e1bc78d2db5061d8557a

INTERFACE_ID=\#redstone-interface-v12
IADAPTER_TEMPLATE_ID=$(INTERFACE_ID):IRedStoneAdapter:IRedStoneAdapter
ICORE_TEMPLATE_ID=$(INTERFACE_ID):IRedStoneCore:IRedStoneCore

BENEFICIARY=Redstone-validator-1
FEATURED_CID=00453547032c154787ce2f52d0830cc302c26abea295b1f4680cf1e795b1095481ca12122043a38116cf841f91ed3d6c1d260cbc85a4cff6b54282d22cf701299422b89d18

TOKEN=$(shell cat token.txt)
CORE_ID_TXT=core_id.txt
ADAPTER_ID_TXT=adapter_id.txt
PRICE_FEED_ID_TXT=price_feed_id.txt
CORE_ID=$(shell cat $(CORE_ID_TXT))
ADAPTER_ID=$(shell cat $(ADAPTER_ID_TXT))
PRICE_FEED_ID=$(shell cat $(PRICE_FEED_ID_TXT))

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
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"], \
					"beneficiary": "$(BENEFICIARY)::$(PARTY_SUFFIX)", \
					"featuredCid": "$(FEATURED_CID)"}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)","$(BENEFICIARY)::$(PARTY_SUFFIX)"], \
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
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"viewers": ["Client::$(PARTY_SUFFIX)"]}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"], \
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
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"beneficiary": "$(BENEFICIARY)::$(PARTY_SUFFIX)", \
					"featuredCid": "$(FEATURED_CID)", \
					"creators": ["RedStoneOracleUpdater::$(PARTY_SUFFIX)"]}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)", "$(BENEFICIARY)::$(PARTY_SUFFIX)"], \
		"commandId": "deploy-factory-$(shell date +%s)"}' | jq '.'

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
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"updaters": ["RedStoneOracleUpdater::$(PARTY_SUFFIX)"], \
					"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"], \
					"pillFactory": "$(FACTORY_ID)", \
					"feedData": []}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"], \
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
	        "RedStoneOracleOwner::$(PARTY_SUFFIX)": { \
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
	        "RedStoneOracleOwner::$(PARTY_SUFFIX)": { \
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
	        "RedStoneOracleOwner::$(PARTY_SUFFIX)": { \
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

get-featured-app-right: get-token
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
					"$(BENEFICIARY)::$(PARTY_SUFFIX)": { \
						"cumulative": [{ \
							"identifierFilter": { \
								"InterfaceFilter": { \
									"value": { \
										"interfaceId": "913a7fbb09560a7bc436fbf695ae973bdb6e0ff070d1563f28f51939938138d6:IRedStonePricePill:IRedStonePricePill", \
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
					"$(BENEFICIARY)::$(PARTY_SUFFIX)": { \
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
