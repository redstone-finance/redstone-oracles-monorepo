
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
	RUSTUP_TOOLCHAIN=nightly-2025-04-14 anchor build --verifiable

build:
	RUSTUP_TOOLCHAIN=nightly-2025-04-14 anchor build

test: build
	RUSTUP_TOOLCHAIN=nightly-2025-04-14 anchor test
