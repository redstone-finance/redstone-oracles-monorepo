sinclude ./.env

CANTON_API=$(PARTICIPANT)/jsonapi/v1
ADAPTER_NAME=RedStoneAdapter-789
ADAPTER_TEMPLATE_ID=09d0d10efe85bb49e7341d7976ae4f6393ac24e51d66ec547fa5a443cc665c40:RedStoneAdapter:RedStoneAdapter
PRICE_FEED_TEMPLATE_ID=b8587a80b73cf11bb9f623e0255c6e02ac27e26d636c605a6836cb2ae4402983:RedStonePriceFeed:RedStonePriceFeed
IADAPTER_TEMPLATE_ID=72376a4cd76a5b74c91df27fbfb56238d076e55df64cbe9212311caecf1d3082:IRedStoneAdapter:IRedStoneAdapter
IPRICE_FEED_TEMPLATE_ID=72376a4cd76a5b74c91df27fbfb56238d076e55df64cbe9212311caecf1d3082:IRedStonePriceFeed:IRedStonePriceFeed
PARTY_SUFFIX=1220a6f7c2315ed7ba230397a459b036bfe9f36763a0e848dad741c4e9d20d85687c

TOKEN=$(shell cat token.txt)
ETH=["69","84","72"]
BTC=["66","84","67"]
ADAPTER_ID_TXT=adapter_id.txt
PRICE_FEED_ID_TXT=price_feed_id.txt
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
	@curl -H "Authorization: Bearer $$(cat token.txt)" \
	  $(PARTICIPANT)/status?port=5002

deploy-adapter: get-token
	curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/create?port=5002" \
	  -d '{ \
		"templateId": "$(ADAPTER_TEMPLATE_ID)", \
		"payload": {  \
			"adapterId":"$(ADAPTER_NAME)", \
			"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
			"updaters": ["RedStoneOracleUpdater::$(PARTY_SUFFIX)"], \
			"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"], \
			"feedData": []}, \
	    "actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"] \
	 }' | jq '.'

deploy-price-feed: get-token
	curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  "$(CANTON_API)/create?port=5002" \
	  -d '{ \
		"templateId": "$(PRICE_FEED_TEMPLATE_ID)", \
		"payload": {  \
			"adapterId":"$(ADAPTER_NAME)", \
			"owner": "RedStoneOracleOwner::$(PARTY_SUFFIX)", \
			"viewers": ["RedStoneOracleViewer::$(PARTY_SUFFIX)"], \
			"feedId": $(ETH), \
			"description": "RedStone ETH PriceFeed"}, \
	    "actAs": ["RedStoneOracleOwner::$(PARTY_SUFFIX)"] \
	 }' | jq '.'

get-adapter-id: get-token
	@CONTRACT_ID=$$(curl -s -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/query \
	  -d '{ \
	    "templateIds": ["$(ADAPTER_TEMPLATE_ID)"] \
	  }' | jq -r '.result[] | select(.payload.adapterId == "$(ADAPTER_NAME)") | .contractId'); \
	echo "$$CONTRACT_ID" > $(ADAPTER_ID_TXT); \
	echo "Adapter ID saved: $$CONTRACT_ID"

get-adapter-id-by-interface: get-token
	@CONTRACT_ID=$$(curl -s -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/query \
	  -d '{ \
	    "templateIds": ["$(IADAPTER_TEMPLATE_ID)"] \
	  }' | jq -r '.result[] | select(.payload.adapterId == "$(ADAPTER_NAME)") | .contractId'); \
	echo "$$CONTRACT_ID" > $(ADAPTER_ID_TXT); \
	echo "Adapter ID saved: $$CONTRACT_ID"
	
get-price-feed-id-by-interface: get-token
	@CONTRACT_ID=$$(curl -s -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/query \
	  -d '{ \
	    "templateIds": ["$(IPRICE_FEED_TEMPLATE_ID)"] \
	  }' | jq --argjson eth '$(ETH)' -r '.result[] | select(.payload.adapterId == "$(ADAPTER_NAME)" and .payload.feedId == $(ETH)) | .contractId'); \
	echo "$$CONTRACT_ID" > $(PRICE_FEED_ID_TXT); \
	echo "Price Feed ID saved: $$CONTRACT_ID"

query-contract: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(CANTON_API)/query \
	  -d '{"templateIds": ["$(IADAPTER_TEMPLATE_ID)"]}' \
	  | jq '.'

check-my-parties: get-token
	@curl -s -H "Authorization: Bearer $(TOKEN)" \
	  $(CANTON_API)/user 

check-my-access:
	@echo $(TOKEN) | cut -d. -f2 | base64 -d
	@echo "=== Who am I ==="
	@curl -s -H "Authorization: Bearer $(TOKEN)" \
	  $(CANTON_API)/user

assign-user-to-participant: get-token
	@curl -X POST -H "Authorization: Bearer $(TOKEN)" \
	  -H "Content-Type: application/json" \
	  $(PARTICIPANT)/admin/users/assign \
	  -d '{ \
	    "userId": "212dc93e-a61e-496c-82fe-1905dfe1e4bf", \
	    "username": "redstone-adapter-viewer" \
	  }' | jq '.' 
