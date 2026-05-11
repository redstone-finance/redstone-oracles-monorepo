include ./deploy.mk

get-traffic-status: get-token
	curl -s -X POST \
		-H "Authorization: Bearer $(TOKEN)" \
		-H "Content-Type: application/json" \
		"$(API)/http-proxy" \
		-d '{"method":"GET","url":"$(SCAN_API)/domains/$(GLOBAL_DOMAIN)/members/$(PAR)/traffic-status","headers":{"Content-Type":"application/json"},"body":"{}"}' | jq

get-remaining-traffic: get-token
	curl -s -X POST \
		-H "Authorization: Bearer $(TOKEN)" \
		-H "Content-Type: application/json" \
		"$(API)/http-proxy" \
		-d '{"method":"GET","url":"$(SCAN_API)/domains/$(GLOBAL_DOMAIN)/members/$(PAR)/traffic-status","headers":{"Content-Type":"application/json"},"body":"{}"}' | jq '.traffic_status | .actual.total_limit - .actual.total_consumed'

buy-traffic: get-token
	@TOKEN=$$(cat token.txt) bash scripts/buy-traffic.sh
