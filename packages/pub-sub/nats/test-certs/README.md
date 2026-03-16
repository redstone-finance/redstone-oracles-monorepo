# Test Certificates

These certificates are for **local development and CI only**. They are not used in production infrastructure.

## Files

- `ca.crt` — self-signed root CA certificate. Passed to NATS clients as `caCert` to verify the server.
- `server.crt` — server certificate signed by the CA above. Used by the NATS server.
- `server.key` — private key for the server certificate. Used by the NATS server.
