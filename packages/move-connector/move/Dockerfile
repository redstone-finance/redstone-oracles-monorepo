# Stage 1: Base builder with Aptos and system dependencies
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
    libudev-dev \
    libdw-dev \
    git \
    ca-certificates \
    jq \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://aptos.dev/scripts/install_cli.sh" | sh -s -- --generic-linux

ENV PATH="/root/.local/bin:${PATH}"

RUN aptos update movefmt --assume-yes

# Stage 2: Move dependency cache
FROM builder AS dependency-cache
COPY contracts/redstone_sdk/Move.toml contracts/redstone_sdk/Move.toml
COPY contracts/price_adapter/Move.toml contracts/price_adapter/Move.toml
COPY contracts/price_feed/Move.toml contracts/price_feed/Move.toml
COPY Makefile .

RUN make download-dependencies

# Stage 3: CI runtime image
FROM builder AS ci-runtime
COPY --from=dependency-cache /root/.move /root/.move

# Add sudo and jq for CI scripts
RUN apt-get update && apt-get install -y \
    sudo \
    jq \
    && rm -rf /var/lib/apt/lists/*

CMD ["bash"]

# Stage 4: Development runtime image
FROM builder AS dev-runtime
COPY --from=dependency-cache /root/.move /root/.move

# Install Node.js and npm
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then NODE_ARCH="x64"; elif [ "$ARCH" = "aarch64" ]; then NODE_ARCH="arm64"; else NODE_ARCH="$ARCH"; fi && \
    curl -fsSL https://nodejs.org/dist/v22.13.1/node-v22.13.1-linux-${NODE_ARCH}.tar.xz | tar -xJ -C /usr/local --strip-components=1 \
    && npm install -g ts-node

RUN corepack enable \
    && corepack prepare yarn@4.5.0 --activate

ENV PATH="/usr/local/bin:${PATH}"

CMD ["bash"]
