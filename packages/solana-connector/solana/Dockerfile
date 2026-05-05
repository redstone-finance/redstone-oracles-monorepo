# Stage 1: Base builder
ARG BUILDARCH=linux/amd64
FROM --platform=$BUILDARCH ubuntu:24.04 AS builder
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

RUN <<EOF
    apt-get update
    apt-get install -y --no-install-recommends \
    make \
    cmake \
    clang \
    curl \
    tar \
    xz-utils \
    pkg-config \
    libssl-dev \
    libudev-dev \
    build-essential \
    git \
    ca-certificates
    rm -rf /var/lib/apt/lists/*
EOF

ENV CC=clang \
    CXX=clang++ \
    RUST_BACKTRACE=1 \
    CARGO_INCREMENTAL=0 \
    RUSTUP_MAX_RETRIES=10 \
    CARGO_TARGET_DIR=/cargo/target \
    CARGO_HOME=/root/.cargo \
    RUSTUP_HOME=/root/.rustup \
    CARGO_BUILD_JOBS=8 \
    CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN <<EOF
    curl --proto '=https' --tlsv1.2 -fsSL https://deb.nodesource.com/setup_24.x | bash
    apt-get install -y --no-install-recommends nodejs
    npm install -g ts-node@10.9.2
    npm cache clean --force
    rm -rf /var/lib/apt/lists/* /root/.npm
EOF

RUN corepack enable && corepack prepare yarn@4.11.0 --activate

WORKDIR /
COPY rust-toolchain.toml rust-toolchain.toml

# Minimal rustup profile, strip docs.
RUN <<EOF
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable
    rm -rf /root/.rustup/toolchains/*/share/doc /root/.rustup/toolchains/*/share/man /tmp/* /var/tmp/*
EOF

ENV PATH="/root/.cargo/bin:${PATH}"

RUN <<EOF
    curl --proto '=https' --tlsv1.2 -sSfL https://release.anza.xyz/stable/install | bash
    rm -rf /root/.cache/solana /tmp/* /var/tmp/*
EOF

ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

RUN solana-keygen new --no-bip39-passphrase

# Install anchor-cli, then purge the registry used only for that install.
RUN <<EOF
    cargo install --git https://github.com/solana-foundation/anchor --tag v1.0.0 anchor-cli --locked --force
    rm -rf /root/.cargo/registry /root/.cargo/git /root/.cache
EOF

RUN <<EOF # keep this in a single layer to keep the image size down
    mkdir -p /tmp/dummy
    cd /tmp/dummy
    anchor init dummy --test-template litesvm
    cd dummy
    anchor build --no-idl
    cd /
    rm -rf /tmp/dummy /cargo/target /root/.cargo/registry /root/.cargo/git /root/.cache
EOF

# Stage 2: Cargo dependency cache
FROM builder AS crate-cache

WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY programs/redstone-solana-price-adapter/Cargo.toml programs/redstone-solana-price-adapter/Cargo.toml

RUN <<EOF
    mkdir -p programs/redstone-solana-price-adapter/src
    echo "" > programs/redstone-solana-price-adapter/src/lib.rs
    cargo fetch
EOF

COPY price-adapter-tests/Cargo.toml price-adapter-tests/Cargo.toml
COPY price-adapter-tests/Cargo.lock price-adapter-tests/Cargo.lock

RUN <<EOF
    mkdir -p price-adapter-tests/src
    echo "" > price-adapter-tests/src/lib.rs
EOF

WORKDIR /build/price-adapter-tests
RUN cargo fetch

RUN rm -rf /root/.cargo/registry/src

# Stage 3: CI runtime image
FROM builder AS ci-runtime
COPY --from=crate-cache /root/.cargo /root/.cargo

RUN <<EOF
    apt-get update && apt-get install -y --no-install-recommends sudo jq
    rm -rf /var/lib/apt/lists/*
EOF

# Stage 4: Development runtime image
FROM builder AS dev-runtime
WORKDIR /redstone-monorepo-priv/packages/solana-connector/solana
CMD ["bash"]
