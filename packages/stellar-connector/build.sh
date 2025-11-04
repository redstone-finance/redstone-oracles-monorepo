#!/bin/sh -Ceu

REPO=redstone-finance/redstone-public-contracts

optimize() {
  target=target/wasm32v1-none/release
  stellar contract optimize --wasm "$target/$1.wasm" --wasm-out "$target/$1.wasm"
}

cd /src
# shellcheck source=/dev/null
. /root/.cargo/env
rustup target add wasm32v1-none

stellar contract build --meta source_repo="$REPO"
optimize redstone_adapter
optimize redstone_price_feed
