FROM ubuntu:24.04
RUN apt-get update && apt-get install -y curl gcc g++
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --default-toolchain=stable --profile=minimal
RUN . /root/.cargo/env && cargo install stellar-cli@22.8.1 --features opt
COPY build.sh /usr/local/bin
