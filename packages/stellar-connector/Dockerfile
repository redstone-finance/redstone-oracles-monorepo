FROM ubuntu:24.04@sha256:24737cef17f4e22b1977df7d9a05e77c4e28b7da5b8911f8d8ccda136bf3573c
RUN apt-get update && apt-get install -y curl gcc g++
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --default-toolchain=stable --profile=minimal
RUN . /root/.cargo/env && cargo install stellar-cli@22.8.1 --features opt
COPY build.sh /usr/local/bin
