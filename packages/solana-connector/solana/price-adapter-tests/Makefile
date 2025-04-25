prepare:
	rustup component add clippy rustfmt

clippy: prepare
	cargo clippy

fmt: prepare
	cargo fmt --all

fmt-check: prepare
	cargo fmt --all --check

test: fmt-check clippy
	cargo test
