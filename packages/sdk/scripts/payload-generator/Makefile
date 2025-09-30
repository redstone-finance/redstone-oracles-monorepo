DATA_DIR=./data
SHELL := /bin/bash
TIMESTAMP_JSON = echo '{"datetime":"$(shell date -u '+%a, %d %b %Y %H:%M:%S GMT')","timestamp":$(shell date +%s)}'

clean:
	rm -rf $(DATA_DIR)

fetch_data:
	mkdir -p $(DATA_DIR)
	ts-node index.ts | tr -d " \t\n\r" > $(DATA_DIR)/${DATA_NAME}.hex &
	ts-node index.ts "json" > $(DATA_DIR)/${DATA_NAME}.json &
	ts-node index.ts "bytes" > $(DATA_DIR)/${DATA_NAME}.tmp

fetch_time:
	@$(TIMESTAMP_JSON) > $(DATA_DIR)/${DATA_NAME}.time

prepare_data: fetch_time fetch_data
	printf '{"bytes":' > $(DATA_DIR)/${DATA_NAME}.input
	cat $(DATA_DIR)/${DATA_NAME}.tmp >> $(DATA_DIR)/${DATA_NAME}.input
	rm $(DATA_DIR)/${DATA_NAME}.tmp
	printf ',' >> $(DATA_DIR)/${DATA_NAME}.input
	@$(TIMESTAMP_JSON) | cut -c 2- >> $(DATA_DIR)/${DATA_NAME}.input
	(echo -n "0x" && cat $(DATA_DIR)/${DATA_NAME}.hex) | fold -w2 | paste -sd' ' -  | sed -E 's/[[:space:]]+/ 0x/g' | cut -c 3- > $(DATA_DIR)/${DATA_NAME}.split

run:
	DATA_NAME=run make prepare_data
