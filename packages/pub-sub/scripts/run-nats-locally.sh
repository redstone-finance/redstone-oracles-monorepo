#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

docker run -d -p 4222:4222 \
  -v "$SCRIPT_DIR/../nats/nats-server.conf:/nats-server.conf:ro" \
  -v "$SCRIPT_DIR/../nats/test-certs:/certs:ro" \
  nats:latest -c /nats-server.conf
