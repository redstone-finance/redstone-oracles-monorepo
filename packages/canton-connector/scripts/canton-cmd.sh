#!/bin/bash
set -euo pipefail

LOCAL_USER=redstone-canton-connector

if [ -n "${CREATE_ARGS:-}" ]; then
  command=$(jq -n \
    --arg templateId "$TEMPLATE_ID" \
    --argjson createArguments "$CREATE_ARGS" \
    '{CreateCommand: {templateId: $templateId, createArguments: $createArguments}}')
else
  command=$(jq -n \
    --arg templateId "$TEMPLATE_ID" \
    --arg contractId "$CONTRACT_ID" \
    --arg choice "$CHOICE" \
    --argjson choiceArgument "${CHOICE_ARG:-"{}"}" \
    '{ExerciseCommand: {templateId: $templateId, contractId: $contractId, choice: $choice, choiceArgument: $choiceArgument}}')
fi

body=$(jq -n \
  --argjson command "$command" \
  --argjson actAs "$ACT_AS" \
  --arg commandId "$CMD_NAME-$(date +%s)" \
  '{
    commands: {commands: [$command], actAs: $actAs, commandId: $commandId},
    transactionFormat: {
      transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS",
      eventFormat: {
        filtersByParty: {
          ($actAs[0]): {
            cumulative: [{identifierFilter: {WildcardFilter: {value: {includeCreatedEventBlob: true}}}}]
          }
        },
        verbose: false
      }
    }
  }')

auth=()
if [ -n "${TOKEN:-}" ]; then
  auth=(-H "Authorization: Bearer $TOKEN")
else
  body=$(jq --arg userId "$LOCAL_USER" '.commands.userId = $userId' <<<"$body")
fi

response=$(curl -sS --fail-with-body -X POST \
  ${auth[@]+"${auth[@]}"} \
  -H "Content-Type: application/json" \
  "$CANTON_API/v2/commands/submit-and-wait-for-transaction" \
  -d "$body") || {
  echo "$response" >&2
  exit 1
}

jq -r "${JQ:-.}" <<<"$response"
