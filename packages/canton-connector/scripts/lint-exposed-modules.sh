#!/bin/bash

DAML_DIR="${1:-./daml}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Checking that packages with Internal modules declare exposed-modules in ${DAML_DIR}${NC}"
echo "----------------------------------------"

TOTAL=0
FAILED=0

while IFS= read -r manifest; do
  package_dir="$(dirname "$manifest")"
  if [ -z "$(find "$package_dir/src" -type d -name Internal 2>/dev/null)" ]; then
    continue
  fi

  TOTAL=$((TOTAL + 1))
  if ! grep -q '^exposed-modules:' "$manifest"; then
    echo -e "${RED}❌ Internal modules without exposed-modules:${NC} $manifest"
    FAILED=$((FAILED + 1))
  fi
done < <(find "$DAML_DIR" -name daml.yaml -not -path "*/.daml/*")

echo "----------------------------------------"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All $TOTAL packages with Internal modules declare exposed-modules${NC}"
else
  echo -e "${RED}❌ $FAILED/$TOTAL packages with Internal modules have no exposed-modules${NC}"
fi

[ $FAILED -eq 0 ]
