sinclude ../.env
export

.PHONY: clippy

set-up-env:
	cargo install cargo-stylus
	@rustup target add wasm32-unknown-unknown
	@rustup component add clippy rustfmt

test: set-up-env
	cd ./price-adapter && cargo test
	cd ./redstone-stylus && cargo test

clippy: set-up-env
	cd ./price-adapter && cargo clippy
	cd ./redstone-stylus && cargo clippy

format: set-up-env
	cd ./price-adapter && cargo fmt
	cd ./redstone-stylus && cargo fmt

deploy: set-up-env
	@source ../.env && cd ./price-adapter && cargo stylus deploy \
		--private-key ${PRIVATE_KEY} \
		-e ${RPC_URL} \
		--no-verify
