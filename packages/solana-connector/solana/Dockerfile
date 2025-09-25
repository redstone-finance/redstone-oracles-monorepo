# Stage 1: Base builder with Rust, Solana, and Node.js
FROM ubuntu:24.04 AS builder

RUN apt-get update && apt-get install -y \
    make \
    cmake \
    clang \
    llvm \
    curl \
    tar \
    xz-utils \
    pkg-config \
    libssl-dev \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV CC=clang \
    CXX=clang++ \
    AR=llvm-ar \
    RUST_BACKTRACE=1 \
    CARGO_INCREMENTAL=0 \
    RUSTUP_MAX_RETRIES=10 \
    CARGO_TARGET_DIR=/cargo/target \
    CARGO_HOME=/root/.cargo \
    RUSTUP_HOME=/root/.rustup \
    CARGO_BUILD_JOBS=8 \
    CARGO_NET_GIT_FETCH_WITH_CLI=true

ENV NODE_VERSION=18.20.5
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g ts-node && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare yarn@4.5.0 --activate

COPY rust-toolchain.toml rust-toolchain.toml

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    rm -rf /tmp/* /var/tmp/*

ENV PATH="/root/.cargo/bin:${PATH}"

RUN cargo install cargo-chef --locked

RUN curl -sSfL https://release.anza.xyz/stable/install | bash

ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

RUN solana-keygen new --no-bip39-passphrase

ENV NIGHTLY_VERSION=nightly-2025-04-14 \
    ANCHOR_NIGHTLY_VERSION=nightly-2024-12-20

RUN rustup install $NIGHTLY_VERSION && \
    rustup install $ANCHOR_NIGHTLY_VERSION

RUN cargo +$ANCHOR_NIGHTLY_VERSION install --git https://github.com/coral-xyz/anchor  --tag v0.30.1 anchor-cli --force

#Pre-warm anchor to bootstrap BPF SDK (https://github.com/solana-foundation/anchor/blob/master/docker/build/Dockerfile#L46)
RUN mkdir -p /tmp/dummy && cd /tmp/dummy && \
    anchor init dummy && \
    cd dummy && \
    RUSTUP_TOOLCHAIN=$NIGHTLY_VERSION anchor build --no-idl

# Stage 2: Cargo dependency cache
FROM builder AS crate-cache

COPY Cargo.toml Cargo.lock ./
COPY programs/redstone-solana-price-adapter/Cargo.toml programs/redstone-solana-price-adapter/Cargo.toml

RUN mkdir -p programs/redstone-solana-price-adapter/src && \
    echo "// dummy lib.rs for cargo chef" > programs/redstone-solana-price-adapter/src/lib.rs

RUN cargo chef prepare --recipe-path recipe.json
RUN cargo chef cook --recipe-path recipe.json --clippy

COPY price-adapter-tests/Cargo.toml price-adapter-tests/Cargo.toml
COPY price-adapter-tests/Cargo.lock price-adapter-tests/Cargo.lock

RUN mkdir -p price-adapter-tests/src && \
    echo "// dummy lib.rs for cargo chef" > price-adapter-tests/src/lib.rs

RUN cd price-adapter-tests && \
    cargo chef prepare --recipe-path test-recipe.json && \
    cargo chef cook --recipe-path test-recipe.json --tests

RUN cargo fetch && \
    cd price-adapter-tests && \
    cargo fetch

# Stage 3: CI runtime image
FROM builder AS ci-runtime
COPY --from=crate-cache /root/.cargo /root/.cargo
COPY --from=crate-cache /cargo/target /cargo/target

# Stage 4: Development runtime image
FROM builder AS dev-runtime

WORKDIR /redstone-monorepo-priv/packages/solana-connector/solana
CMD ["bash"]
