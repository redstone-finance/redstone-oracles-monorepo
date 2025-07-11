include ../../.env
export

set-up-env:
	cargo install cargo-stylus
	@rustup target add wasm32-unknown-unknown
	@rustup component add clippy rustfmt

deploy: set-up-env
	@source ../../.env && cargo stylus deploy \
		--private-key ${PRIVATE_KEY} \
		-e ${RPC_URL} \
		--no-verify
