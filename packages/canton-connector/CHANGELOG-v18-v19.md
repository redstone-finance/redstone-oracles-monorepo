# Changelog: DAML v18 → v19

---

## Summary

Audit hardening pass ([PR #11480](https://github.com/redstone-finance/redstone-oracles-monorepo/pull/11480),
`redstone-audit-v18-findings.pdf`): validation chains reworked into an `Either`-threaded form, tuple-shaped
public types replaced by named records, new input validations on signatures, hex payloads and feed ids.

| Area            | Change type                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Error handling  | `???` returns `Either Text ()` threaded through a do-block terminated by `(!!!)`, replacing `let _ = check …` bindings |
| Public types    | `RedStoneResult` tuple → record; `RedStonePriceData.timestamp` → `packageTimestamp`; `ProcessorError` record           |
| New validations | Signature recovery byte, `isHex` on payload and public key, empty feed id, empty timestamp list                        |
| Interface shape | `WritePricesContext` fields de-`Optional`ed; `PillInput` / `PillCreationParams` records replace positional tuple args  |
| Viewer checks   | `iRedStoneCore_ShouldVerifyViewer` removed — the decision moves inside `iRedStoneCore_VerifyViewer`                    |
| Staleness       | `iRedStonePricePill_AssertDataNotStaleImpl` removed in favour of a module-level `assertDataNotStale` helper            |
| Reward factor   | `1.1` → `1.15`, aligning the v19 line with the value hot-patched onto the deployed v18 reward factory (`0.4.7`)        |
| Package version | v18 → v19 (single line for all packages)                                                                               |

> Note on the error-handling rework: Daml is a **strict** language, so the previous `let _ = cond ??? err` bindings
> _were_ evaluated and the checks did fire. The rework buys deterministic check ordering (multiple `let` bindings
> have no guaranteed order — see [daml#6788](https://github.com/digital-asset/daml/issues/6788)), composability, and
> typed errors — not enforcement that was previously missing.

---

## Renamed files

| Before                                  | After                                     | Note                                   |
| --------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `adapter/src/Config.daml`               | `adapter/src/RedStoneAdapter/Config.daml` | Module header only; contents identical |
| `core/src/Config.daml`                  | `core/src/RedStoneCore/Config.daml`       | Module header only; contents identical |
| `sdk/src/RedStone/ProcessorResult.daml` | `sdk/src/RedStone/ProcessorTypes.daml`    | Renamed and rewritten (see below)      |

Both `Config` modules were unqualified `module Config where`, which collided across packages; they are now
namespaced under their template's module.

No new files.

---

## Type changes

### `types/src/RedStoneTypes.daml`

```diff
 type RedStoneValue = Numeric 8
-type RedStoneResult = ([RedStoneValue], Int)
 type RedStoneFeedId = [Int]
 type PayloadHex = Text

+data RedStoneResult = RedStoneResult
+  with
+    prices : [RedStoneValue]
+    packageTimestamp : Int
+  deriving (Eq, Show, Ord)
+
 data RedStonePriceData a = RedStonePriceData
   with
     value: a
-    timestamp: Int
+    packageTimestamp: Int
     writeTimestamp: Int
```

`RedStoneResult` becomes a record, so `GetPrices` returns `{prices, packageTimestamp}` instead of a positional
`DamlTuple2`. `RedStonePriceData.timestamp` is renamed to `packageTimestamp` to distinguish the data-package
timestamp from `writeTimestamp` (ledger write time) — the two were easy to confuse at call sites.

### `sdk/src/RedStone/ProcessorTypes.daml`

`DecimalValue`, `value_divisor` and `u256ToDecimalValue` move here from the old `ProcessorResult` module, and
error payloads become a named type:

```diff
+data ProcessorError = ProcessorError with message : Text
+  deriving (Eq, Show, Ord)
+
+type ProcessorOutcome  = ([Result DecimalValue ProcessorError], Int)
+type ProcessorRawOutcome = ([Result U256 ProcessorError], Int)
```

Previously processor errors were bare `Text`, which made them indistinguishable from any other string payload.

---

## Interface changes

### `IRedStoneAdapter`

```diff
-  iRedStoneAdapter_WritePricesImpl : … -> Optional WritePricesContext -> Update (ContractId IRedStoneAdapter)
+  iRedStoneAdapter_WritePricesImpl : … -> WritePricesContext -> Update (ContractId IRedStoneAdapter)

   nonconsuming choice WritePrices : ContractId IRedStoneAdapter
     with
       …
-      context : Optional WritePricesContext
+      context : WritePricesContext
     controller caller
     do
+      assertMsg "WritePrices: paidTrafficCost must be non-negative" (context.paidTrafficCost >= 0)
       iRedStoneAdapter_VerifyUpdater this caller
```

The context is now mandatory, and a negative `paidTrafficCost` is rejected at the choice boundary rather than
flowing into reward accounting.

### `WritePricesContext`

```diff
 data WritePricesContext = WritePricesContext
   with
-    additionalPillViewers : Optional [Party]
-    paidTrafficCost : Optional Int
+    additionalPillViewers : [Party]
+    paidTrafficCost : Int

-empty_write_prices_context = WritePricesContext with additionalPillViewers = None, paidTrafficCost = None
+empty_write_prices_context = WritePricesContext with additionalPillViewers = [], paidTrafficCost = 0
```

`Optional [Party]` had two representations of "no viewers" (`None` and `Some []`); the empty list is now the only
one, and `Optional Int` no longer needs a `fromOptional 0` at every use.

### `IRedStoneCore`

```diff
-  iRedStoneCore_ShouldVerifyViewer : Party -> Bool
   iRedStoneCore_VerifyViewer : Party -> Update ()

   nonconsuming choice GetPrices : RedStoneResult
     …
     do
-      if iRedStoneCore_ShouldVerifyViewer this caller then
-         iRedStoneCore_VerifyViewer this caller
-      else
-         pure ()
-
+      iRedStoneCore_VerifyViewer this caller
       iRedStoneCore_GetPricesImpl this caller feedIds currentTime payloadHex
```

The "should I check?" flag is gone from the interface — an implementation that wants to skip the check now encodes
that in its own `VerifyViewer` (see `RedStoneCore` below). One less way for an implementor to accidentally opt out
of authorization by returning `False`.

### `IRedStonePricePillFactory`

Positional arguments become records:

```diff
+data PillInput = PillInput
+  with
+    feedId : RedStoneFeedId
+    priceData : RedStonePriceData RedStoneValue
+  deriving (Eq, Show, Ord)
+
+data PillCreationParams = PillCreationParams
+  with
+    viewers : [Party]
+    adapterId : Text
+    stalenessMs : Int
+  deriving (Eq, Show)

-  iRedStonePricePillFactory_CreatePricePillsImpl: [Party] -> Text -> Int -> [(RedStoneFeedId, RedStonePriceData RedStoneValue)] -> Update […]
+  iRedStonePricePillFactory_CreatePricePillsImpl: PillCreationParams -> [PillInput] -> Update […]
```

`[Party] -> Text -> Int` was three unlabelled positional parameters; `(RedStoneFeedId, RedStonePriceData …)` tuples
are now labelled too.

### `IRedStonePricePill`

```diff
-  iRedStonePricePill_AssertDataNotStaleImpl: Update ()

       iRedStonePricePill_VerifyViewer this caller
-        >> iRedStonePricePill_AssertDataNotStaleImpl this
+        >> assertDataNotStale this

+assertDataNotStale this = do
+  stale <- iRedStonePricePill_IsDataStaleImpl this
+  assertMsg "Price Data is stale and cannot be read" (not stale)
```

The staleness assertion is derived from `IsDataStaleImpl` in one place instead of being a separate method each
implementation had to implement consistently with its own staleness check.

`ReadTimestamp` and `ReadDescription` follow the `priceData.timestamp` → `packageTimestamp` rename.

---

## Template changes

### `RedStoneAdapter`

```diff
-      iRedStoneCore_ShouldVerifyViewer _ = True
-      iRedStoneCore_VerifyViewer caller = assertMsg "…" $ caller `elem` (viewers ++ updaters)
+      iRedStoneCore_VerifyViewer caller = assertMsg "…" $ any (elem caller) [viewers, updaters]

-      iRedStoneAdapter_WritePricesImpl caller self feedIds currentTime payloadHex contextOrNone = do
-        let context = fromOptional empty_write_prices_context contextOrNone
+      iRedStoneAdapter_WritePricesImpl caller self feedIds currentTime payloadHex context = do

-        let allViewers = dedup $ viewers <> fromOptional [] context.additionalPillViewers
-        let ctx = WriteContext with … paidTrafficCost = context.paidTrafficCost
+        let allViewers = dedup $ viewers ++ context.additionalPillViewers
+        let ctx = WriteContext with … paidTrafficCost = Some context.paidTrafficCost
```

`any (elem caller) [viewers, updaters]` short-circuits instead of building the concatenated list.

### `RedStoneCore`

```diff
-      iRedStoneCore_ShouldVerifyViewer caller = shouldVerifyViewer
-      iRedStoneCore_VerifyViewer caller = assertMsg "GetPrices: caller must be a viewer" $ caller `elem` viewers
+      iRedStoneCore_VerifyViewer caller = if shouldVerifyViewer then assertMsg "GetPrices: caller must be a viewer" (caller `elem` viewers) else pure ()

-          G.getPricesNumeric config payloadHex
+          uncurry RedStoneResult <$> G.getPricesNumeric config payloadHex
```

The template's `shouldVerifyViewer` field is unchanged; only where it is consulted moved.

### `RedStonePricePill`

```diff
     adapterId : Text
   where
+    ensure stalenessMs >= 0
+
     signatory owner
```

A negative staleness window would make `IsDataStale` true from creation; the contract can no longer be created that way.

### `PriceUpdateEvent`

The `Optional priceData` / `Optional error` pair becomes a sum type, with the boolean kept consistent by `ensure`:

```diff
+data PriceUpdate
+  = Updated (RedStonePriceData RedStoneValue)
+  | Skipped ProcessorError
+  deriving (Eq, Show)

 template PriceUpdateEvent
   with
     feedId : RedStoneFeedId
     isSkipped : Bool
-    priceData : Optional (RedStonePriceData RedStoneValue)
-    error : Optional Text
+    update : PriceUpdate
     …
   where
+    ensure isSkipped == (case update of Skipped _ -> True; Updated _ -> False)
```

Previously `(isSkipped = True, priceData = Some …, error = None)` was representable; now it is not.

### `RedStonePricePillFactory`

Adapted to `PillCreationParams` / `PillInput` field access; no behavioural change.

---

## New validations

| Check                                        | File                                | v18 behaviour                  |
| -------------------------------------------- | ----------------------------------- | ------------------------------ |
| Signature recovery byte `v ∈ {0, 1, 27, 28}` | `sdk/Internal/Der.daml`             | `v` byte split off and ignored |
| `isHex` + even length on public key          | `sdk/Internal/Der.daml`             | length/prefix check only       |
| `isHex` on payload                           | `sdk/Internal/Verify.daml`          | none                           |
| Non-empty timestamp list before `head`       | `sdk/Internal/Verify.daml`          | `head []` → generic crash      |
| Non-empty `feedId` in `isValidFeedId`        | `sdk/Config.daml`                   | `[]` passed as a valid feed id |
| `paidTrafficCost >= 0`                       | `interface/IRedStoneAdapter.daml`   | none                           |
| `stalenessMs >= 0`                           | `price_feed/RedStonePricePill.daml` | none                           |
| Invalid hex digit value                      | `sdk/Internal/Hex.daml`             | silently rendered as `"?"`     |

---

## SDK internals

### `sdk/src/RedStone/Internal/Error.daml`

```diff
-check cond orError =
-    if cond then () else error $ show orError
-
 infixl 1 ???
-cond ??? orError = check cond orError
+(???) : Show a => Bool -> RedStoneError a -> Either Text ()
+cond ??? orError = if cond then Right () else Left (show orError)
+
+(!!!) = either error identity
```

Call sites in `Config.daml`, `Processor.daml`, `Internal/Verify.daml`, `Internal/Der.daml` and `Internal/Trim.daml`
follow the same shape:

```diff
-someFun args =
-  let
-    _ = cond1 ??? err1
-    _ = cond2 ??? err2
-  in result
+someFun args = (!!!) $ do
+  _ <- cond1 ??? err1
+  _ <- cond2 ??? err2
+  pure result
```

### `sdk/src/RedStone/Internal/Hex.daml`

`hexCharToInt` switches from `elemIndex` over a list to a `Map` lookup (and accepts upper-case digits directly
rather than lower-casing first); `hexIntToChar` raises on an out-of-range value instead of returning `"?"`.

### `sdk/src/RedStone/Internal/Protocol.daml`

`leByteListToIntAcc` takes the range as a parameter, so `f byte_range` is computed once instead of on every byte.

### `sdk/src/RedStone/Config.daml`

Field renames for readability, plus one behavioural fix:

```diff
-    maxDelayMs : Int
-    maxAheadMs : Int
+    maxAllowedPackageTimestampDelayMs : Int
+    maxAllowedPackageTimestampAheadMs : Int

 isValidFeedId feedId =
-  L.length feedId <= feed_id_bs && L.all (\b -> b >= 0 && b <= byte_max) feedId
+  not (null feedId) && L.length feedId <= feed_id_bs && L.all (\b -> b >= 0 && b <= byte_max) feedId

-isNotIDE = isLedgerTimeGT unix_epoch_start
+hasLedgerTime = isLedgerTimeGT unix_epoch_start
```

Values are unchanged: `maxAllowedPackageTimestampDelayMs = 3 min`, `maxAllowedPackageTimestampAheadMs = 1 min`.

### `sdk/src/RedStone/Internal/Const.daml`, `U256.daml`

`int_size` → `int_size_bytes`, `u256_size` → `uint256_size_bytes` (the values are byte counts, not bit widths).
In `u256FromIntAcc`, `(remaining - remaining % byte_range) / byte_range` becomes `remaining / byte_range` —
equivalent for non-negative input, one operation instead of three.

### `sdk/src/RedStone/Internal/CryptoVerify.daml`

`f . g $ x` → `f $ g x` cleanup only; the `secp256k1WithEcdsaOnly` verification path is unchanged.

---

## Reward configuration

The audit commit touched `reward_factory/src/RewardConfig.daml` only to drop a stale `-- or 1024, to test`
comment. The factor itself is changed **in this release**:

```diff
-reward_factor_frac_num = one_mb_price * 11
-reward_factor_frac_den = one_mb * 10
+reward_factor_frac_num = one_mb_price * 115
+reward_factor_frac_den = one_mb * 100
```

`1.1` → `1.15` (≈66 → ≈69 CC per MB of traffic at `one_mb_price = 60`). This mirrors the change applied to the
**deployed v18** reward factory in [PR #11627](https://github.com/redstone-finance/redstone-oracles-monorepo/pull/11627)
(`redstone-reward-factory-v18` `0.4.6` → `0.4.7`), which was never backported to the v19 line. Without this,
promoting v19 to mainnet would have silently lowered the reward weight.

The package is bumped `redstone-reward-factory-v19` `0.4.0` → **`0.4.1`**. This is required, not cosmetic:
v19 is already deployed on devnet as `0.4.0`, so shipping changed sources under the same name+version would
produce two different packages with identical coordinates. Bumping the patch version is the same mechanism used
on the deployed v18 line, where the reward factory went `0.4.3` → `0.4.6` → `0.4.7` while
`reward_factory_id.txt` never changed — same package name plus a higher version is an in-place upgrade, so the
`RedStoneRewardFactory` contract keeps its contract id and its `factoryId` text, and only the package behind it
is replaced.

For context, the factor history on the deployed v18 line:

| Version | Factor | Formula                                                                               |
| ------- | ------ | ------------------------------------------------------------------------------------- |
| `0.4.3` | 1.15   | `rewardWeight _` ignored its argument — flat reward from `each_update_reward = 90 kB` |
| `0.4.6` | 1.1    | Rewritten to be traffic-proportional, with a `total > reward_min_count` guard         |
| `0.4.7` | 1.15   | Factor restored                                                                       |

1.15 was the original intent (`0.4.3` carried a `-- 115%` comment); it was lost while the formula was rewritten
in `0.4.6` and restored four days later in `0.4.7`. v19 now matches.

`min_reward_creation_ms` (7 min), `reward_min_count` (5 kB) and `one_mb_price` (60) are unchanged.

---

## TypeScript side

| File                                                                               | Change                                                                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/adapters/CoreCantonContractAdapter.ts`, `CoreClientCantonContractAdapter.ts`  | `(result as DamlTuple2<string[]>)._1` → `(result as { prices: string[] }).prices`               |
| `src/utils/price-feed-utils.ts`                                                    | New `packageTimestampOf` reading `packageTimestamp ?? timestamp`, and a shared `parsePriceData` |
| `src/adapters/PricePillCantonContractAdapter.ts`, `PricesCantonReadOnlyAdapter.ts` | Use `packageTimestampOf` / `parsePriceData` instead of inline `priceData.timestamp`             |
| `src/canton-defs.json`                                                             | `devnet` + `localnet` → `#redstone-interface-v19` / `#redstone-price-pill-v19`                  |
| `Makefile`, `deploy.mk`, `ops.mk`                                                  | `VERSION=-v19-0.4.0`; contract names `RedStone*-v19-0.4.0`                                      |
| `relayer-manifests-non-evm/cantonDevnetMultiFeed.json` (`main` + `fallback`)       | `adapterContract` / `adapterContractPackageId` / `priceFeedAddress` → v19                       |

`packageTimestampOf` is a deliberate compatibility shim: it lets the same client read both v18 pills
(`timestamp`) and v19 pills (`packageTimestamp`), so the TS side does not have to be cut over in lockstep
with the ledger.

> The `mainnet` section of `canton-defs.json` is left at `v18` — those entries reference contracts deployed on
> mainnet (including `core.createdEventBlob`, used as a disclosed contract) and must be regenerated only after
> redeployment.

---

## Package version changes

| Package                   | Before    | After         |
| ------------------------- | --------- | ------------- |
| `redstone-common`         | v18-0.4.0 | **v19-0.4.0** |
| `redstone-types`          | v18-0.4.0 | **v19-0.4.0** |
| `redstone-sdk`            | v18-0.4.0 | **v19-0.4.0** |
| `redstone-sdk-tests`      | v18-0.4.0 | **v19-0.4.0** |
| `redstone-interface`      | v18-0.4.0 | **v19-0.4.0** |
| `redstone-core`           | v18-0.4.0 | **v19-0.4.0** |
| `redstone-adapter`        | v18-0.4.0 | **v19-0.4.0** |
| `redstone-price-pill`     | v18-0.4.0 | **v19-0.4.0** |
| `redstone-price-feed`     | v18-0.4.0 | **v19-0.4.0** |
| `redstone-featured`       | v18-0.4.0 | **v19-0.4.0** |
| `redstone-factory`        | v18-0.4.0 | **v19-0.4.0** |
| `redstone-reward-factory` | v18-0.4.0 | **v19-0.4.1** |
| `redstone-test`           | v18-0.4.0 | **v19-0.4.0** |

All `daml.yaml` files share `name: redstone-*-v19`; every package is at `version: 0.4.0` except
`redstone-reward-factory`, bumped to `0.4.1` for the reward-factor change (see below). All `data-dependencies`
references updated, including the DAR filename in `test/daml.yaml`. The package **name** carries the generation, so v19 is a new package with no upgrade relationship to
v18 — deploying it is a fresh deploy, not a Daml upgrade, and the `version` counter restarts at `0.4.0`.

After a fresh `daml build --all`, regenerate `daml/package-ids.json` via `make generate-package-ids`
(`make verify-package-ids` checks it in CI).

---

## Deployment status

| Network | Adapter                     | Interface                 |
| ------- | --------------------------- | ------------------------- |
| devnet  | `RedStoneAdapter-v19-0.4.0` | `#redstone-interface-v19` |
| mainnet | `RedStoneAdapter-v18-0.4.0` | `#redstone-interface-v18` |

Mainnet still runs v18. `deployments/cantonMultiFeed/` is the frozen snapshot of that deployment and should be
refreshed in place once v19 is cut over.
