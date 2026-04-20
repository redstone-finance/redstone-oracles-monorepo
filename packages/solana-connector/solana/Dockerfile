# Stage 1: Base builder
ARG BUILDARCH=linux/amd64
FROM --platform=$BUILDARCH ubuntu:24.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
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
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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

ENV NODE_VERSION=18.20.5
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g ts-node && \
    npm cache clean --force && \
    rm -rf /var/lib/apt/lists/* /root/.npm

RUN corepack enable && corepack prepare yarn@4.5.0 --activate

COPY rust-toolchain.toml rust-toolchain.toml

# Minimal rustup profile, strip docs.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
        sh -s -- -y --profile minimal --default-toolchain stable && \
    rm -rf /root/.rustup/toolchains/*/share/doc \
           /root/.rustup/toolchains/*/share/man \
           /tmp/* /var/tmp/*

ENV PATH="/root/.cargo/bin:${PATH}"

RUN curl -sSfL https://release.anza.xyz/stable/install | bash && \
    rm -rf /root/.cache/solana /tmp/* /var/tmp/*

ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

RUN solana-keygen new --no-bip39-passphrase

# Install anchor-cli, then purge the registry used only for that install.
RUN cargo install --git https://github.com/solana-foundation/anchor \
        --tag v1.0.0 anchor-cli --locked --force && \
    rm -rf /root/.cargo/registry /root/.cargo/git /root/.cache

RUN mkdir -p /tmp/dummy && cd /tmp/dummy && \
    anchor init dummy --test-template litesvm && \
    cd dummy && anchor build --no-idl && \
    cd / && rm -rf /tmp/dummy /cargo/target /root/.cargo/registry /root/.cargo/git /root/.cache

# Stage 2: Cargo dependency cache
FROM builder AS crate-cache

WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY programs/redstone-solana-price-adapter/Cargo.toml programs/redstone-solana-price-adapter/Cargo.toml

RUN mkdir -p programs/redstone-solana-price-adapter/src && \
    echo "" > programs/redstone-solana-price-adapter/src/lib.rs && \
    cargo fetch

COPY price-adapter-tests/Cargo.toml price-adapter-tests/Cargo.toml
COPY price-adapter-tests/Cargo.lock price-adapter-tests/Cargo.lock

RUN mkdir -p price-adapter-tests/src && \
    echo "" > price-adapter-tests/src/lib.rs && \
    cd price-adapter-tests && cargo fetch

RUN rm -rf /root/.cargo/registry/src

# Stage 3: CI runtime image
FROM builder AS ci-runtime
COPY --from=crate-cache /root/.cargo /root/.cargo

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Stage 4: Development runtime image
FROM builder AS dev-runtime
WORKDIR /redstone-monorepo-priv/packages/solana-connector/solana
CMD ["bash"]
