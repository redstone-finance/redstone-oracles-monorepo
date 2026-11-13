#!/usr/bin/env bash
set -euo pipefail

# Generates package-ids.json from built DARs.
# Usage: ./generate-package-ids.sh
# Requires: dpm CLI, jq

extract_dar_field() {
  local dir=$1
  local field=$2

  local dar
  dar=$(find "$dir"/.daml/dist -maxdepth 1 -name '*.dar' -print -quit 2>/dev/null)

  if [ -z "$dar" ]; then
    echo "ERROR: No DAR found in $dir/.daml/dist/" >&2
    exit 1
  fi

  dar_file_field "$dar" "$field"
}

dar_file_field() {
  local dar=$1
  local field=$2

  local dar_name
  dar_name=$(basename "$dar" .dar)

  local line
  line=$(dpm damlc inspect-dar "$dar" 2>&1 |
    grep "^$dar_name-" |
    head -1)

  if [ -z "$line" ]; then
    echo "ERROR: Could not find package line for $dar_name in $dar" >&2
    exit 1
  fi

  case "$field" in
  hash)
    echo "$line" | grep -o '[a-f0-9]\{64\}' | head -1
    ;;
  name)
    echo "$line" | sed -E 's/^(.+)-[0-9]+\.[0-9]+\.[0-9]+-[a-f0-9]{64}.*/\1/'
    ;;
  version)
    echo "$line" | sed -E 's/^.+-([0-9]+\.[0-9]+\.[0-9]+)-[a-f0-9]{64}.*/\1/'
    ;;
  *)
    echo "ERROR: Unknown field: $field. Expected: hash, name, version" >&2
    exit 1
    ;;
  esac
}

extract_hash() {
  extract_dar_field "$1" hash
}

extract_name() {
  extract_dar_field "$1" name
}

extract_version() {
  extract_dar_field "$1" version
}

extract_optional_hash() {
  if [ -f "$1/daml.yaml" ]; then
    extract_hash "$1"
  fi
}

extract_optional_name_ref() {
  if [ -f "$1/daml.yaml" ]; then
    echo "#$(extract_name "$1")"
  fi
}

extract_optional_vendored_hash() {
  if [ -d "$1" ]; then
    local dar
    dar=$(find "$1" -maxdepth 1 -name "$2-*.dar" -print -quit)
    if [ -n "$dar" ]; then
      dar_file_field "$dar" hash
    fi
  fi
}

interface_exists() {
  if [ -f "interface/src/$1.daml" ]; then
    echo "$1"
  fi
}

echo "Extracting package IDs from DARs..." >&2

INTERFACE_HASH=\#$(extract_name interface)
CORE_HASH=$(extract_hash core)
ADAPTER_HASH=$(extract_optional_hash adapter)
FACTORY_HASH=$(extract_optional_hash factory)
REWARD_FACTORY_HASH=$(extract_hash reward_factory)
PRICE_FEED_HASH=$(extract_optional_hash price_feed)
PRICE_PILL_HASH=$(extract_optional_name_ref price_pill)
FEATURED_HASH=$(extract_hash featured)
SDK_HASH=$(extract_hash sdk)
ADAPTER_INTERFACE=$(interface_exists IRedStoneAdapter)
PILL_FACTORY_INTERFACE=$(interface_exists IRedStonePricePillFactory)
CAPS_ORACLE_HASH=$(extract_optional_hash caps-oracle)
CAPS_CAPSULE_ARCHIVER_HASH=$(extract_optional_vendored_hash deps caps-capsule-archiver)
CAPS_ROUND_ARCHIVER_HASH=$(extract_optional_vendored_hash deps caps-round-archiver)

jq -n \
  --arg interface "$INTERFACE_HASH" \
  --arg core "$CORE_HASH" \
  --arg adapter "$ADAPTER_HASH" \
  --arg factory "$FACTORY_HASH" \
  --arg reward_factory "$REWARD_FACTORY_HASH" \
  --arg price_feed "$PRICE_FEED_HASH" \
  --arg price_pill "$PRICE_PILL_HASH" \
  --arg featured "$FEATURED_HASH" \
  --arg sdk "$SDK_HASH" \
  --arg adapter_interface "$ADAPTER_INTERFACE" \
  --arg pill_factory_interface "$PILL_FACTORY_INTERFACE" \
  --arg caps_oracle "$CAPS_ORACLE_HASH" \
  --arg caps_capsule_archiver "$CAPS_CAPSULE_ARCHIVER_HASH" \
  --arg caps_round_archiver "$CAPS_ROUND_ARCHIVER_HASH" \
  '{
    redstone_sdk: $sdk,
    interface: $interface,
    core: $core,
    adapter: $adapter,
    factory: $factory,
    reward_factory: $reward_factory,
    price_feed: $price_feed,
    price_pill: $price_pill,
    featured: $featured,
    caps_oracle: $caps_oracle,
    caps_capsule_archiver: $caps_capsule_archiver,
    caps_round_archiver: $caps_round_archiver,
    templates: {
      adapter: ($adapter + ":RedStoneAdapter:RedStoneAdapter"),
      core: ($core + ":RedStoneCore:RedStoneCore"),
      core_client: ($core + ":RedStoneCoreClient:RedStoneCoreClient"),
      factory: ($factory + ":RedStonePricePillFactory:RedStonePricePillFactory"),
      reward_factory: ($reward_factory + ":RedStoneRewardFactory:RedStoneRewardFactory"),
      caps_oracle: ($caps_oracle + ":RedStoneCapsOracle:RedStoneCapsOracle"),
      caps_oracle_state: ($caps_oracle + ":RedStoneCapsOracleState:RedStoneCapsOracleState"),
      caps_capsule_archiver: ($caps_capsule_archiver + ":Caps.CapsuleArchiver:CapsuleArchiver"),
      caps_round_archiver: ($caps_round_archiver + ":Caps.RoundArchiver:RoundArchiver")
    },
    interfaces: {
      adapter: ($interface + ":IRedStoneAdapter:IRedStoneAdapter"),
      core: ($interface + ":IRedStoneCore:IRedStoneCore"),
      pill_factory: ($interface + ":IRedStonePricePillFactory:IRedStonePricePillFactory"),
      reward_factory: ($interface + ":IRedStoneRewardFactory:IRedStoneRewardFactory"),
      pill: ($price_pill + ":IRedStonePricePill:IRedStonePricePill")
    }
  }
  | if $adapter == "" then del(.adapter, .templates.adapter) else . end
  | if $factory == "" then del(.factory, .templates.factory) else . end
  | if $price_feed == "" then del(.price_feed) else . end
  | if $price_pill == "" then del(.price_pill, .interfaces.pill) else . end
  | if $adapter_interface == "" then del(.interfaces.adapter) else . end
  | if $pill_factory_interface == "" then del(.interfaces.pill_factory) else . end
  | if $caps_oracle == "" then del(.caps_oracle, .templates.caps_oracle, .templates.caps_oracle_state) else . end
  | if $caps_capsule_archiver == "" then del(.caps_capsule_archiver, .templates.caps_capsule_archiver) else . end
  | if $caps_round_archiver == "" then del(.caps_round_archiver, .templates.caps_round_archiver) else . end'
