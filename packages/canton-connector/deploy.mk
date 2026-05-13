DEPLOY_DIR ?= daml

sinclude .env

CANTON_API=$(API)
PACKAGE_IDS=$(DEPLOY_DIR)/package-ids.json

ADAPTER_NAME=RedStoneAdapter-v18-0.4.0
ADAPTER_TEMPLATE_ID=$(shell jq -r '.templates.adapter' $(PACKAGE_IDS))

CORE_NAME=RedStoneCore-v18-0.4.0
CORE_TEMPLATE_ID=$(shell jq -r '.templates.core' $(PACKAGE_IDS))
CORE_CLIENT_TEMPLATE_ID=$(shell jq -r '.templates.core_client' $(PACKAGE_IDS))

FACTORY_NAME=RedStonePricePillFactory-v18-0.4.0
FACTORY_TEMPLATE_ID=$(shell jq -r '.templates.factory' $(PACKAGE_IDS))

FACTORY_ID=$(shell cat $(DEPLOY_DIR)/factory_id.txt 2>/dev/null)

REWARD_FACTORY_NAME=RedStoneRewardFactory-v18-0.4.0
REWARD_FACTORY_TEMPLATE_ID=$(shell jq -r '.templates.reward_factory' $(PACKAGE_IDS))

REWARD_FACTORY_ID=$(shell cat $(DEPLOY_DIR)/reward_factory_id.txt 2>/dev/null)

IADAPTER_TEMPLATE_ID=$(shell jq -r '.interfaces.adapter' $(PACKAGE_IDS))
ICORE_TEMPLATE_ID=$(shell jq -r '.interfaces.core' $(PACKAGE_IDS))

ifeq ($(NETWORK),mainnet)
  BENEFICIARY ?= Redstone-validator-1
  FEATURED_CID ?= 00453547032c154787ce2f52d0830cc302c26abea295b1f4680cf1e795b1095481ca12122043a38116cf841f91ed3d6c1d260cbc85a4cff6b54282d22cf701299422b89d18
endif
ifeq ($(NETWORK),devnet)
  BENEFICIARY ?= 8b4399ba-c401-4a97-a1fe-59077a8b3b14
  FEATURED_CID ?= 00deaaad88568938379d75d095961036688c49cca81efa596de41f578fe1ac1c2fca121220a86ed774b5e19df71fe79139d3fbb08e603db71977437cd997c7e1771efab2cc
endif

TOKEN=$(shell cat token.txt)

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
										"interfaceId": "$(IADAPTER_TEMPLATE_ID)", \
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
		}' | jq '[.[] | select(.contractEntry.JsActiveContract.createdEvent.templateId | test("CoreClient"))]'
