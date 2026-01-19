# Stage 1: Base builder with Sui and system dependencies
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
    jq \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN ARCH=$(uname -m) && \
    SUI_VERSION=$(curl -s https://api.github.com/repos/MystenLabs/sui/releases/latest | jq -r .tag_name) && \
    echo "Installing Sui version: $SUI_VERSION for arch: $ARCH" && \
    curl -L "https://github.com/MystenLabs/sui/releases/download/${SUI_VERSION}/sui-${SUI_VERSION}-ubuntu-${ARCH}.tgz" -o sui.tgz && \
    tar -xzf sui.tgz && \
    chmod +x sui && \
    mv sui /usr/local/bin/sui && \
    rm sui.tgz

# Stage 2: Sui dependency cache
FROM builder AS dependency-cache
COPY contracts/price_adapter/Move.toml contracts/price_adapter/Move.toml
RUN cd contracts/price_adapter && \
    sui move build

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
