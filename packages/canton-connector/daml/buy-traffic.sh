#!/bin/bash
set -euo pipefail

#shellcheck disable=SC1091
. ../.env

CANTON_API="${PARTICIPANT}${API_PATH}"
SCAN_PROXY="${API}/http-proxy"
TRAFFIC_AMOUNT=200000 # must be greater than 200_000

echo "=== Fetching AmuletRules ==="
AMULET_RULES_FULL=$(curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${SCAN_PROXY}" \
  -d '{"method":"POST","url":"'"${SCAN_API}"'/amulet-rules","headers":{"Content-Type":"application/json"},"body":"{}"}')

AMULET_RULES=$(echo "${AMULET_RULES_FULL}" | jq -r '.amulet_rules_update.contract.contract_id')
echo "AmuletRules: ${AMULET_RULES}"
AMULET_RULES_CEB=$(echo "${AMULET_RULES_FULL}" | jq -r '.amulet_rules_update.contract.created_event_blob')

echo "=== Fetching Rounds ==="
ROUNDS=$(curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${SCAN_PROXY}" \
  -d '{"method":"POST","url":"'"${SCAN_API}"'/open-and-issuing-mining-rounds","headers":{"Content-Type":"application/json"},"body":"{\"cached_open_mining_round_contract_ids\":[],\"cached_issuing_round_contract_ids\":[]}"}')

OPEN_ROUND=$(echo "${ROUNDS}" | jq -r '.open_mining_rounds | to_entries[0].value.contract.contract_id')
ISSUING=$(echo "${ROUNDS}" | jq -c '[.issuing_mining_rounds | to_entries[] | [.value.contract.payload.round, .value.contract.contract_id]] | .[0:-1]')
echo "OpenRound: ${OPEN_ROUND}"
echo "Issuing: ${ISSUING}"
OPEN_ROUND_CEB=$(echo "${ROUNDS}" | jq -r '.open_mining_rounds | to_entries[0].value.contract.created_event_blob')
ISSUING_CEBS=$(echo "${ROUNDS}" | jq --arg synchronizerId "$GLOBAL_DOMAIN" -c '[.issuing_mining_rounds | to_entries[] | [.value.contract.contract_id, .value.contract.created_event_blob]] | map({contractId: .[0], createdEventBlob: .[1], synchronizerId: $synchronizerId}) | .[]' | paste -sd, -)

echo "=== Fetching Active Contracts ==="
LEDGER_END=$(curl -s -X GET \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${CANTON_API}/v2/state/ledger-end" | jq -r '.offset')

curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${CANTON_API}/v2/state/active-contracts?limit=100" \
  -d "{\"filter\":{\"filtersByParty\":{\"${VALIDATOR}\":{\"cumulative\":[{\"identifierFilter\":{\"WildcardFilter\":{\"value\":{\"includeCreatedEventBlob\":true}}}}]}}},\"activeAtOffset\":${LEDGER_END}}" \
  >/tmp/acs.json

AMULET_CID=$(jq -r '[.[] | .contractEntry.JsActiveContract.createdEvent | select(.templateId | endswith("Splice.Amulet:Amulet")) | .contractId][0]' /tmp/acs.json)
echo "Amulet: ${AMULET_CID}"

VALIDATOR_RIGHT=$(jq -r '[.[] | .contractEntry.JsActiveContract.createdEvent | select(.templateId | endswith("ValidatorRight")) | .contractId][0]' /tmp/acs.json)
echo "ValidatorRight: ${VALIDATOR_RIGHT}"

echo "=== Buying Traffic ==="
CMD_ID="buy-traffic-$(date +%s)"

curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${CANTON_API}/v2/commands/submit-and-wait" \
  -d "{
    \"commands\":[{\"ExerciseCommand\":{
      \"templateId\":\"#splice-amulet:Splice.AmuletRules:AmuletRules\",
      \"contractId\":\"${AMULET_RULES}\",
      \"choice\":\"AmuletRules_BuyMemberTraffic\",
      \"choiceArgument\":{
        \"provider\":\"${VALIDATOR}\",
        \"inputs\":[{\"tag\":\"InputAmulet\",\"value\":\"${AMULET_CID}\"}],
        \"context\":{
          \"openMiningRound\":\"${OPEN_ROUND}\",
          \"issuingMiningRounds\":${ISSUING},
          \"validatorRights\":[[\"${VALIDATOR}\",\"${VALIDATOR_RIGHT}\"]],
          \"featuredAppRight\":null
        },
        \"memberId\":\"${PAR}\",
        \"synchronizerId\":\"${GLOBAL_DOMAIN}\",
        \"migrationId\":${MIGRATION_ID},
        \"trafficAmount\":${TRAFFIC_AMOUNT},
        \"expectedDso\":\"${DSO_PARTY}\"
      }
    }}],
    \"actAs\":[\"${VALIDATOR}\"],
    \"disclosedContracts\":[${ISSUING_CEBS},{\"contractId\":\"${AMULET_RULES}\",\"createdEventBlob\": \"${AMULET_RULES_CEB}\", \"synchronizerId\": \"${GLOBAL_DOMAIN}\"},{\"contractId\":\"${OPEN_ROUND}\",\"createdEventBlob\": \"${OPEN_ROUND_CEB}\", \"synchronizerId\": \"${GLOBAL_DOMAIN}\"}],
    \"commandId\":\"${CMD_ID}\"
  }" | jq
