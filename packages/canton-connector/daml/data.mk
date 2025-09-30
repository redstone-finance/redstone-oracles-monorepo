DATA_NAME=daml
DATA_DIR=../../sdk/scripts/payload-generator
PAYLOAD=$(shell cat ${DATA_DIR}/data/${DATA_NAME}.hex)

get_data:
	make -C $(DATA_DIR) DATA_NAME=$(DATA_NAME) prepare_data

prepare_data: get_data
	sed s/##PAYLOAD##/"${PAYLOAD}"/g ./test/input.json.input > ./test/input.json
