NIGHTLY_TOOLCHAIN := nightly-2025-04-14

prepare:
	rustup component add clippy rustfmt

clippy: prepare
	cargo clippy

fmt: prepare
	cargo fmt --all

fmt-check: prepare
	cargo fmt --all --check

lint: clippy fmt-check

build-verifiable:
	anchor build --verifiable

build:
	anchor build

copy-program:
	@mkdir -p target/deploy
	@if [ -n "$$CARGO_TARGET_DIR" ]; then \
		if [ "$$CARGO_TARGET_DIR/deploy/redstone_solana_price_adapter.so" != "$(PWD)/target/deploy/redstone_solana_price_adapter.so" ]; then \
			cp "$$CARGO_TARGET_DIR/deploy/redstone_solana_price_adapter.so" "target/deploy/redstone_solana_price_adapter.so"; \
		else \
			echo "Source and destination are the same, skipping copy"; \
		fi; \
	else \
		echo "CARGO_TARGET_DIR not set, skipping copy"; \
	fi 

contract-sandbox-test: build copy-program
	make -C price-adapter-tests test
