#!/bin/bash

EXTENSIONS="${1:-daml yaml json md mk sh}"
EXCLUDE_DIRS="${2:-.daml .vscode node_modules .git target dist build}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERROR=0
TOTAL=0
FAILED=0

echo -e "${YELLOW}Checking files with extensions: ${EXTENSIONS}${NC}"
echo -e "${YELLOW}Excluding: ${EXCLUDE_DIRS}${NC}"
echo "----------------------------------------"

GREP_PATTERN=""
for dir in $EXCLUDE_DIRS; do
  if [ -z "$GREP_PATTERN" ]; then
    GREP_PATTERN="/${dir}/"
  else
    GREP_PATTERN="$GREP_PATTERN|/${dir}/"
  fi
done

for ext in $EXTENSIONS; do
  while IFS= read -r file; do
    TOTAL=$((TOTAL + 1))

    file_size=$(wc -c <"$file")

    if [ "$file_size" -eq 0 ]; then
      echo -e "${YELLOW}⚠ Empty file:${NC} $file"
      continue
    fi

    if [ "$file_size" -eq 1 ]; then
      last_char=$(tail -c 1 "$file" | xxd -p)
      if [ "$last_char" != "0a" ]; then
        echo -e "${RED}❌ No newline:${NC} $file"
        FAILED=$((FAILED + 1))
        ERROR=1
      else
        echo -e "${GREEN}✅ OK:${NC} $file"
      fi
      continue
    fi

    last_two=$(tail -c 2 "$file" | xxd -p)
    last_char="${last_two: -2}"
    prev_char="${last_two:0:2}"

    if [ "$last_char" != "0a" ]; then
      echo -e "${RED}❌ No newline:${NC} $file"
      FAILED=$((FAILED + 1))
      ERROR=1
    elif [ "$prev_char" = "0a" ]; then
      echo -e "${RED}❌ Multiple newlines:${NC} $file"
      FAILED=$((FAILED + 1))
      ERROR=1
    else
      echo -e "${GREEN}✅ OK:${NC} $file"
    fi
  done < <(find . -type f -name "*.${ext}" | grep -Ev "$GREP_PATTERN")
done

echo "----------------------------------------"
if [ $ERROR -eq 0 ]; then
  echo -e "${GREEN}✅ All $TOTAL files end with exactly one newline${NC}"
else
  echo -e "${RED}❌ $FAILED/$TOTAL files have incorrect endings${NC}"
fi

exit $ERROR
