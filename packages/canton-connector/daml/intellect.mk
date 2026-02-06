sinclude ../.env

CANTON_API=$(PARTICIPANT)/jsonapi
ADAPTER_NAME=RedStoneCore-v8-0.4.5
ADAPTER_TEMPLATE_ID=b2b36ed1bb200eb5dea279e680b97f19ba6683675c4d3600dfee255d673af8a:RedStoneAdapter:RedStoneAdapter
PRICE_FEED_TEMPLATE_ID=73aa948cdac0069e03897ca9285cad79b7aaa3ea77c5e769a6529c67d30cc31a:RedStonePriceFeed:RedStonePriceFeed

CORE_ID := 2c574f54a072a09bb12ab8a0682c5febbe2ad4c9b38de926c08781155ff30023
CORE_TEMPLATE_ID := $(CORE_ID):RedStoneCore:RedStoneCore
CORE_FEATURED_TEMPLATE_ID := $(CORE_ID):RedStoneCoreFeatured:RedStoneCoreFeatured
CORE_CLIENT_TEMPLATE_ID := $(CORE_ID):RedStoneCoreClient:RedStoneCoreClient
CORE_FEATURED_CLIENT_TEMPLATE_ID := $(CORE_ID):RedStoneCoreFeaturedClient:RedStoneCoreFeaturedClient
FACTORY_TEMPLATE_ID=2c5e66c256f6ec3fe3e03c1b11583657b4e9c9b0fda10dc287587ab2a6427a5c:RedStonePricePillFactory:RedStonePricePillFactory

INTERFACE_ID=285e5fe0bd69ce089ba43c058e636942e1bca2ca3b89edb5f0a5b68fe3ee7042
IADAPTER_TEMPLATE_ID=$(INTERFACE_ID):IRedStoneAdapter:IRedStoneAdapter
IPRICE_FEED_TEMPLATE_ID=$(INTERFACE_ID):IRedStonePriceFeed:IRedStonePriceFeed
ICORE_TEMPLATE_ID=$(INTERFACE_ID):IRedStoneCore:IRedStoneCore

BENEFICIARY=8b4399ba-c401-4a97-a1fe-59077a8b3b14

TOKEN=$(shell cat token.txt)
ETH=["69","84","72"]
BTC=["66","84","67"]
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
					"coreId": "$(ADAPTER_NAME)", \
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"]}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"], \
		"commandId": "deploy-core-$(shell date +%s)"}' | jq '.'

deploy-core-featured: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(CORE_FEATURED_TEMPLATE_ID)", \
				"createArguments": { \
					"coreId": "$(ADAPTER_NAME)", \
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"beneficiary": "$(BENEFICIARY)::$(PARTY_SUFFIX)", \
					"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"]}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)", "$(BENEFICIARY)::$(PARTY_SUFFIX)"], \
		"commandId": "deploy-core-featured-$(shell date +%s)"}' | jq '.'

deploy-factory: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(FACTORY_TEMPLATE_ID)", \
				"createArguments": { \
					"coreId": "Factory-$(ADAPTER_NAME)", \
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"beneficiary": "$(BENEFICIARY)::$(PARTY_SUFFIX)", \
					"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"]}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)", "$(BENEFICIARY)::$(PARTY_SUFFIX)"], \
		"commandId": "deploy-core-featured-$(shell date +%s)"}' | jq '.'

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

deploy-core-featured-client: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(CORE_FEATURED_CLIENT_TEMPLATE_ID)", \
				"createArguments": { \
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"viewers": ["Client::$(PARTY_SUFFIX)"]}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"], \
		"commandId": "deploy-core-featured-client-$(shell date +%s)"}' | jq '.'


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
					"feedData": []}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"], \
		"commandId": "deploy-adapter-$(shell date +%s)"}' | jq '.'

deploy-price-feed: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/v2/commands/submit-and-wait-for-transaction-tree" \
	  -d '{ \
		"commands": [{ \
			"CreateCommand": { \
				"templateId": "$(PRICE_FEED_TEMPLATE_ID)", \
				"createArguments": { \
					"adapterId":"$(ADAPTER_NAME)", \
					"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
					"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"], \
					"feedId": $(ETH), \
					"description": "RedStone ETH PriceFeed"}}}], \
		"actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"], \
		"commandId": "deploy-price-feed-$(shell date +%s)"}' | jq '.'

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
	
get-price-feed-id-by-interface: get-token
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
	                  "interfaceId": "$(IPRICE_FEED_TEMPLATE_ID)", \
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
	  }' | jq -r '.[-1].contractEntry.JsActiveContract.createdEvent.contractId'); \
	echo "$$CONTRACT_ID" > $(PRICE_FEED_ID_TXT); \
	echo "Price Feed ID saved: $$CONTRACT_ID at offset $$LEDGER_END"

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
										"interfaceId": "7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda:Splice.Api.FeaturedAppRightV1:FeaturedAppRight", \
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
		"$(CANTON_API)/v2/state/active-contracts" \
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
