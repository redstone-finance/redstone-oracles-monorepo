#!/usr/bin/env bash
set -euo pipefail

# Generates package-ids.json from built DARs.
# Usage: ./generate-package-ids.sh
# Requires: daml CLI, jq

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

extract_hash() {
  local dir=$1
  local dar
  dar=$(find "$dir"/.daml/dist -maxdepth 1 -name '*.dar' -print -quit 2>/dev/null)
  if [ -z "$dar" ]; then
    echo "ERROR: No DAR found in $dir/.daml/dist/" >&2
    exit 1
  fi
  local name
  name=$(basename "$dar" .dar)
  local hash
  hash=$(daml damlc inspect-dar --no-legacy-assistant-warning "$dar" 2>&1 |
    grep "$name-" | head -1 | grep -o '[a-f0-9]\{64\}' | head -1)
  if [ -z "$hash" ]; then
    echo "ERROR: Could not extract package hash from $dar" >&2
    exit 1
  fi
  echo "$hash"
}

echo "Extracting package IDs from DARs..." >&2

INTERFACE_HASH=$(extract_hash interface)
CORE_HASH=$(extract_hash core)
ADAPTER_HASH=$(extract_hash adapter)
FACTORY_HASH=$(extract_hash factory)
REWARD_FACTORY_HASH=$(extract_hash reward_factory)
PRICE_FEED_HASH=$(extract_hash price_feed)
PRICE_PILL_HASH=$(extract_hash price_pill)
FEATURED_HASH=$(extract_hash featured)

jq -n \
  --arg interface "$INTERFACE_HASH" \
  --arg core "$CORE_HASH" \
  --arg adapter "$ADAPTER_HASH" \
  --arg factory "$FACTORY_HASH" \
  --arg reward_factory "$REWARD_FACTORY_HASH" \
  --arg price_feed "$PRICE_FEED_HASH" \
  --arg price_pill "$PRICE_PILL_HASH" \
  --arg featured "$FEATURED_HASH" \
  '{
    interface: $interface,
    core: $core,
    adapter: $adapter,
    factory: $factory,
    reward_factory: $reward_factory,
    price_feed: $price_feed,
    price_pill: $price_pill,
    featured: $featured,
    templates: {
      adapter: ($adapter + ":RedStoneAdapter:RedStoneAdapter"),
      core: ($core + ":RedStoneCore:RedStoneCore"),
      core_client: ($core + ":RedStoneCoreClient:RedStoneCoreClient"),
      factory: ($factory + ":RedStonePricePillFactory:RedStonePricePillFactory"),
      reward_factory: ($reward_factory + ":RedStoneRewardFactory:RedStoneRewardFactory")
    },
    interfaces: {
      adapter: ($interface + ":IRedStoneAdapter:IRedStoneAdapter"),
      core: ($interface + ":IRedStoneCore:IRedStoneCore"),
      pill_factory: ($interface + ":IRedStonePricePillFactory:IRedStonePricePillFactory"),
      reward_factory: ($interface + ":IRedStoneRewardFactory:IRedStoneRewardFactory"),
      pill: ($price_pill + ":IRedStonePricePill:IRedStonePricePill")
    }
  }' >package-ids.json

echo "Written to package-ids.json" >&2
cat package-ids.json
