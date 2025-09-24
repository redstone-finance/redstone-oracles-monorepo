# Stage 1: Build environment
FROM rust:1.81.0-slim AS builder

# Install build dependencies
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
    && rm -rf /var/lib/apt/lists/*

ENV CC=clang
ENV CXX=clang++
ENV AR=llvm-ar
ENV RUST_BACKTRACE=1
ENV CARGO_INCREMENTAL=0
ENV RUSTUP_MAX_RETRIES=10
ENV CARGO_TARGET_DIR=/cargo/target
ENV CARGO_BUILD_JOBS=8
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

# Install Rust tools
RUN cargo install cargo-chef --locked
RUN rustup target add wasm32-unknown-unknown
RUN cargo install --force radix-clis --locked
RUN cargo install wasm-bindgen-cli@0.2.95 wasm-pack --locked

# Stage 2: Plan dependencies
FROM builder AS planner
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock
COPY rust-toolchain.toml rust-toolchain.toml

COPY common/Cargo.toml common/Cargo.toml
RUN mkdir -p common/src && \
    echo "// dummy lib.rs for cargo chef" > common/src/lib.rs

COPY contracts/price_adapter/Cargo.toml contracts/price_adapter/Cargo.toml
COPY contracts/price_adapter/Cargo.lock contracts/price_adapter/Cargo.lock
RUN mkdir -p contracts/price_adapter/src && \
    echo "// dummy lib.rs for cargo chef" > contracts/price_adapter/src/lib.rs

COPY contracts/price_feed/Cargo.toml contracts/price_feed/Cargo.toml
RUN mkdir -p contracts/price_feed/src && \
    echo "// dummy lib.rs for cargo chef" > contracts/price_feed/src/lib.rs

COPY contracts/proxy/Cargo.toml contracts/proxy/Cargo.toml
RUN mkdir -p contracts/proxy/src && \
    echo "// dummy lib.rs for cargo chef" > contracts/proxy/src/lib.rs

RUN cargo chef prepare --recipe-path recipe.json
RUN cargo fetch

# Stage 3: Build dependencies
FROM builder AS crate-cache
COPY --from=planner /usr/local/cargo /usr/local/cargo
COPY --from=planner recipe.json recipe.json

RUN cargo chef cook --recipe-path recipe.json
RUN cargo chef cook --recipe-path recipe.json --tests
RUN cargo chef cook --recipe-path recipe.json --all-features --all-targets --clippy --release

# Stage 4: CI Runtime image
FROM builder AS ci-runtime
COPY --from=crate-cache /usr/local/cargo /usr/local/cargo
COPY --from=crate-cache /cargo/target /cargo/target

# Stage 5: Development Runtime image
FROM builder AS dev-runtime

# Install Node.js and npm
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then NODE_ARCH="x64"; elif [ "$ARCH" = "aarch64" ]; then NODE_ARCH="arm64"; else NODE_ARCH="$ARCH"; fi && \
    curl -fsSL https://nodejs.org/dist/v22.13.1/node-v22.13.1-linux-${NODE_ARCH}.tar.xz | tar -xJ -C /usr/local --strip-components=1 \
    && npm install -g ts-node

RUN corepack enable \
    && corepack prepare yarn@4.5.0 --activate

ENV PATH="/usr/local/bin:${PATH}"
ENV CARGO_TARGET_DIR=./target
