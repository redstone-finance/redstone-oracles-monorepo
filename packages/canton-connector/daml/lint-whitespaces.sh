#!/bin/bash

FIX_MODE=""
if [ "$1" = "--fix" ]; then
  FIX_MODE="--fix"
  shift
fi

EXTENSIONS="${1:-daml yaml json md mk sh}"
EXCLUDE_DIRS="${2:-.daml .vscode node_modules .git target dist build}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$FIX_MODE" = "--fix" ]; then
  echo -e "${BLUE}Running in FIX mode${NC}"
fi
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

TOTAL=0
FAILED=0
FIXED=0

for ext in $EXTENSIONS; do
  while IFS= read -r file; do
    TOTAL=$((TOTAL + 1))
    ISSUES=""
    HAS_TRAILING=false
    HAS_NO_NEWLINE=false
    HAS_MULTIPLE_NEWLINES=false

    file_size=$(wc -c <"$file")

    if [ "$file_size" -eq 0 ]; then
      echo -e "${YELLOW}⚠ Empty file:${NC} $file"
      continue
    fi

    trailing_lines=$(grep -n '[^[:space:]][[:space:]]\+$' "$file" 2>/dev/null)
    if [ -n "$trailing_lines" ]; then
      count=$(echo "$trailing_lines" | wc -l | tr -d '[:space:]')
      ISSUES="${ISSUES}trailing whitespace ($count lines), "
      HAS_TRAILING=true
    fi

    if [ "$file_size" -eq 1 ]; then
      last_char=$(tail -c 1 "$file" | xxd -p)
      if [ "$last_char" != "0a" ]; then
        ISSUES="${ISSUES}no newline, "
        HAS_NO_NEWLINE=true
      fi
    else
      last_two=$(tail -c 2 "$file" | xxd -p)
      last_char="${last_two: -2}"
      prev_char="${last_two:0:2}"

      if [ "$last_char" != "0a" ]; then
        ISSUES="${ISSUES}no newline, "
        HAS_NO_NEWLINE=true
      elif [ "$prev_char" = "0a" ]; then
        ISSUES="${ISSUES}multiple newlines, "
        HAS_MULTIPLE_NEWLINES=true
      fi
    fi

    if [ -n "$ISSUES" ]; then
      ISSUES="${ISSUES%, }"

      if [ "$FIX_MODE" = "--fix" ]; then
        echo -e "${BLUE}🔧 Fixing ${ISSUES}:${NC} $file"

        if [ -n "$trailing_lines" ]; then
          echo "$trailing_lines" | while read -r line; do
            linenum="${line%%:*}"
            content="${line#*:}"
            echo -e "   ${YELLOW}$linenum:${NC} ${content}${RED}⎵${NC}"
          done
        fi

        if [ "$HAS_TRAILING" = true ]; then
          sed -i '' 's/[[:space:]]*$//' "$file"
        fi

        if [ "$HAS_NO_NEWLINE" = true ]; then
          echo "" >>"$file"
        fi

        if [ "$HAS_MULTIPLE_NEWLINES" = true ]; then
          while [ "$(tail -c 2 "$file" | xxd -p)" = "0a0a" ]; do
            truncate -s -1 "$file"
          done
        fi

        FIXED=$((FIXED + 1))
      else
        echo -e "${RED}❌ ${ISSUES}:${NC} $file"

        if [ -n "$trailing_lines" ]; then
          echo "$trailing_lines" | while read -r line; do
            linenum="${line%%:*}"
            content="${line#*:}"
            echo -e "   ${YELLOW}$linenum:${NC} ${content}${RED}⎵${NC}"
          done
        fi

        FAILED=$((FAILED + 1))
      fi
    fi
  done < <(find . -type f -name "*.${ext}" | grep -Ev "$GREP_PATTERN")
done

echo "----------------------------------------"
if [ "$FIX_MODE" = "--fix" ]; then
  echo -e "${BLUE}🔧 Fixed $FIXED/$TOTAL files${NC}"
elif [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All $TOTAL files OK${NC}"
else
  echo -e "${RED}❌ $FAILED/$TOTAL files have issues${NC}"
  echo -e "${YELLOW}Run with --fix to auto-fix: $0 --fix${NC}"
fi

[ $FAILED -eq 0 ] || [ "$FIX_MODE" = "--fix" ]
