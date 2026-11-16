# RedStone Canton Connector

The contracts, their structure and the PricePill model are described in the
[devnet snapshot](../deployments/cantonDevnetMultiFeed/README.md).

## [Test](./test)

1. Contains some tests as scripts as there's no a native unit-tests mechanism
2. Provides also integration tests for local/ide/ledger deploying and running.
3. Must be extended to cover more cases

## [DARs](./dars)

The built RedStone Daml SDK, `redstone-sdk-v1`, as `make build-sdk` produces it
from [sdk](./sdk); it carries `redstone-common-v1` from [common](./common).
Packages outside this repository build against this file rather than a build of
their own, so that they reference the same package ids.

## License

The RedStone Daml SDK, that is the packages under [sdk](./sdk),
[common](./common) and [sdk-tests](./sdk-tests) and its DAR in [dars](./dars),
is licensed under Apache-2.0; each of those directories carries its own
`LICENSE` file and every Daml source file an SPDX header. Everything else in
this directory follows the repository's root [LICENSE](../../../LICENSE).
