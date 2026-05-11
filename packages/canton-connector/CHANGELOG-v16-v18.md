# Changelog: DAML v16 → v18

---

## Summary

Traffic-weighted reward calculation, write-prices context object, pill demotion timestamps, and assorted internal refactors.

| Area | Change type |
|------|------------|
| WritePrices API | `additionalPillViewers` parameter wrapped into `WritePricesContext`, with new `paidTrafficCost` field |
| Reward calculation | Pill-count weighting → traffic-cost weighting (`reward_factor` derived from `one_mb_price`) |
| Reward state | `RewardState.accumulatedPillCount` → `RewardState.paidTrafficCost` |
| Pill archival | Demotion-based: `PillRecord.demotedTimestamp` decides eligibility, not write timestamp |
| Adapter | `WriteContext` carries `paidTrafficCost`; `iRedStoneAdapter_WritePricesImpl` takes `Optional WritePricesContext` |
| Package version | v16 → v18 (single line for all packages) |

> v17 was an internal WIP — packages briefly bumped to v17 across PRs #10610, #10753, #10776, #10886, #10913, #9991, #10894 before being consolidated into v18 here.

---

## New files

| File | Description |
|------|-------------|
| `interface/src/WritePricesContext.daml` | New `WritePricesContext` record bundling `additionalPillViewers : Optional [Party]` and `paidTrafficCost : Optional Int`; `empty_write_prices_context` helper |
| `test/src/Helpers/Setup.daml` | Reusable `allocateTestParties` and `setUpAdapter` for new test suites |
| `test/src/PartialNewData.daml` | Test for partial-new-data path (only some feeds new) |
| `test/src/PillArchival.daml` | Test for demotion-based pill archival |
| `test/src/RewardsBatching.daml` | Test for traffic-weighted reward batching across writes |
| `scripts/buy-traffic.sh` | Helper script for purchasing traffic on testnets |
| `daml/traffic.mk` | Makefile fragment exposing `buy-traffic` and traffic-status targets |
| `sdk-tests/src/RedStone/Tests/Suites/ConfigErrors.daml` | New error-path suite for config validation |
| `sdk-tests/src/RedStone/Tests/Suites/DerErrors.daml` | DER decoding error cases |
| `sdk-tests/src/RedStone/Tests/Suites/MatrixInput.daml` | Matrix-input building tests (replaces inline cases) |
| `sdk-tests/src/RedStone/Tests/Suites/ProcessorErrors.daml` | Processor error-path coverage |
| `sdk-tests/src/RedStone/Tests/Suites/U256Errors.daml` | U256 overflow / invalid-input cases |
| `sdk-tests/src/RedStone/Tests/Suites/VerifyErrors.daml` | Signature/timestamp verification error cases |

---

## Interface changes

### `IRedStoneAdapter`

```diff
 module IRedStoneAdapter where

 import RedStoneTypes
+import WritePricesContext

 interface IRedStoneAdapter where
   ...
-  iRedStoneAdapter_WritePricesImpl : Party -> (ContractId IRedStoneAdapter) -> [RedStoneFeedId] -> Time -> PayloadHex -> Optional [Party] -> Update (ContractId IRedStoneAdapter)
+  iRedStoneAdapter_WritePricesImpl : Party -> (ContractId IRedStoneAdapter) -> [RedStoneFeedId] -> Time -> PayloadHex -> Optional WritePricesContext -> Update (ContractId IRedStoneAdapter)

   nonconsuming choice WritePrices : ContractId IRedStoneAdapter
     with
       caller : Party
       feedIds : [RedStoneFeedId]
       currentTime : Time
       payloadHex : PayloadHex
-      additionalPillViewers : Optional [Party]
+      context : Optional WritePricesContext
     controller caller
     do
       iRedStoneAdapter_VerifyUpdater this caller
-        >> iRedStoneAdapter_WritePricesImpl this caller self feedIds currentTime payloadHex additionalPillViewers
+        >> iRedStoneAdapter_WritePricesImpl this caller self feedIds currentTime payloadHex context
```

##### Migration (caller side)

```diff
 exerciseCmd cid WritePrices with
   caller, feedIds, currentTime, payloadHex
-  additionalPillViewers = Some [client]
+  context = Some $ empty_write_prices_context with
+    additionalPillViewers = Some [client]
+    paidTrafficCost = Some 23000  -- traffic actually consumed by this submission
```

`paidTrafficCost = None` is accepted and is equivalent to `Some 0` for reward weighting.

### `WritePricesContext` (NEW)

```haskell
module WritePricesContext where

data WritePricesContext = WritePricesContext
  with
    additionalPillViewers : Optional [Party]
    paidTrafficCost : Optional Int
  deriving (Eq, Show, Ord)

empty_write_prices_context = WritePricesContext with
  additionalPillViewers = None
  paidTrafficCost = None
```

---

## Template changes

### `RedStoneAdapter`

```diff
       iRedStoneAdapter_VerifyViewer caller = assertMsg "..." $ caller `elem` (viewers ++ updaters)

-      iRedStoneAdapter_WritePricesImpl caller self feedIds currentTime payloadHex additionalPillViewers = do
-        let ctx = WriteContext with caller, owner, updaters, viewers
+      iRedStoneAdapter_WritePricesImpl caller self feedIds currentTime payloadHex contextOrNone = do
+        let context = fromOptional empty_write_prices_context contextOrNone
+        let ctx = WriteContext with caller, owner, updaters, viewers, paidTrafficCost = None
         hasNewValues <- hasNewPrices ctx adapterId feedData feedIds currentTime payloadHex
         ...
-          exercise (...) WritePricesConsuming with caller, feedIds, currentTime, payloadHex, additionalPillViewers
+          exercise (...) WritePricesConsuming with caller, feedIds, currentTime, payloadHex, context

     choice WritePricesConsuming : ContractId IRedStoneAdapter
       with
         caller : Party
         feedIds : [RedStoneFeedId]
         currentTime : Time
         payloadHex : PayloadHex
-        additionalPillViewers : Optional [Party]
+        context : WritePricesContext
       controller caller
       do
-        let allViewers = dedup $ viewers <> fromOptional [] additionalPillViewers
-        let ctx = WriteContext with caller, owner, updaters, viewers = allViewers
+        let allViewers = dedup $ viewers <> fromOptional [] context.additionalPillViewers
+        let ctx = WriteContext with
+              caller, owner, updaters
+              viewers = allViewers
+              paidTrafficCost = context.paidTrafficCost
```

Also: idiomatic cleanup `return` → `pure` across `iRedStoneAdapter_*Impl` bodies.

### `RedStoneRewardFactory`

```diff
       iRedStoneRewardFactory_CreateRewardsImpl count = do
         let weight = rewardWeight count
-        takeRewards weight beneficiary featuredCid
-        pure weight
+
+        if weight >= 1.0 then
+          takeRewards weight beneficiary featuredCid
+            >> pure weight
+        else
+          pure 0.0
```

`FeaturedAppActivityMarker` requires `weight >= 1.0`; when traffic-weighted reward falls below the threshold (small batches), the call is now skipped instead of failing.

---

## Reward configuration overhaul

### `reward_factory/src/RewardConfig.daml`

```diff
-reward_factor_frac_num = 3
-reward_factor_frac_den = 4
-
-rewardWeight total =
-  intToDecimal (total * reward_factor_frac_num) / intToDecimal reward_factor_frac_den
+one_kb = 1000  -- or 1024, to test
+one_mb = one_kb * one_kb
+one_mb_price = 60
+
+reward_factor_frac_num = one_mb_price * 11
+reward_factor_frac_den = one_mb * 10
+reward_min_count = 5 * one_kb  -- estimated cost of creating marker
+
+rewardWeight total =
+  if total > reward_min_count then
+    intToDecimal ((total - reward_min_count) * reward_factor_frac_num) /
+    intToDecimal reward_factor_frac_den
+  else
+    0.0
```

**Semantic shift**: `total` is no longer "pill count" — it's `paidTrafficCost` (in bytes) accumulated across writes. Reward weight is `(traffic - 5KB) × 11 × 60 / (10 × 1MB)`. The 5KB floor accounts for marker-creation overhead; below that no reward is issued.

### `adapter/src/Internal/Rewards.daml`

```diff
 data RewardState = RewardState
   with
-    accumulatedPillCount: Int
+    paidTrafficCost: Int
     lastCreateTimestamp: Int

 empty_state = RewardState with
-  accumulatedPillCount = 0
+  paidTrafficCost = 0
   lastCreateTimestamp = 0

-maybeCreateRewards caller rewardFactory rewardState currentTimestamp count = do
+maybeCreateRewards rewardFactory =
+  maybeCreateRewardsForState
+    (\(state, currentTimestamp) ->
+        currentTimestamp >= state.lastCreateTimestamp + min_reward_creation_ms)
+    rewardFactory
+
+maybeCreateRewardsForState stateCheck caller rewardFactory rewardState currentTimestamp cost = do
   let state = fromOptional empty_state rewardState
-  let newCount = count + state.accumulatedPillCount
+  let newCost = cost + state.paidTrafficCost

   case rewardFactory of
     Some factory
-      | newCount > 0 && currentTimestamp >= state.lastCreateTimestamp + min_reward_creation_ms ->
-          callCreateRewards caller factory currentTimestamp newCount
-    _ -> pure $ state with accumulatedPillCount = newCount
+      | newCost > 0 && stateCheck (state, currentTimestamp) ->
+          callCreateRewards caller factory currentTimestamp newCost
+    _ -> pure $ state with paidTrafficCost = newCost

-maybeCreateRewardsWithoutState caller rewardFactory =
-  maybeCreateRewards caller rewardFactory None min_reward_creation_ms
+maybeCreateRewardsWithoutState caller rewardFactory cost = do
+  maybeCreateRewardsForState (const True) caller rewardFactory None 0 cost
+    >> pure ()
```

`maybeCreateRewardsForState` is the new generalised helper. `maybeCreateRewards` wraps it with the time-window throttle (`min_reward_creation_ms`); `maybeCreateRewardsWithoutState` bypasses the window (used by `IRedStoneCore.GetPrices` on adapter, where there's no persistent state to carry over).

### `adapter/src/Internal/ProcessPayload.daml`

```diff
 data WriteContext = WriteContext
   with
     caller : Party
     owner : Party
     updaters : [Party]
     viewers : [Party]
+    paidTrafficCost : Optional Int
   deriving (Eq, Show)

 processAndWritePrices ctx factories adapterId currentState feedIds currentTime payloadHex = do
   ...
-    newRewardState <- maybeCreateRewards ctx.caller factories.rewardFactory currentState.rewardState config.currentTimestamp $ length newValues
+    newRewardState <- maybeCreateRewards ctx.caller factories.rewardFactory currentState.rewardState config.currentTimestamp $ fromOptional 0 ctx.paidTrafficCost
```

`length newValues` (pill count) was the unit of reward; now it's `paidTrafficCost` (bytes), threaded through `WriteContext`.

---

## Pill archival: demotion-based

### `adapter/src/Internal/PillRecord.daml`

```diff
 data PillRecord = PillRecord
   with
     priceData: RedStonePriceData RedStoneValue
     pillCid : Optional (ContractId IRedStonePricePill)
+    demotedTimestamp : Optional Int
   deriving (Eq, Show)

-createNewRecords inputData newPills =
-  zip (map fst inputData) $ zipWith PillRecord (map snd inputData) newPills
+createNewRecords inputData newPills =
+    zip (map fst inputData) $
+      zipWith (\pd cid ->
+                 PillRecord with
+                   priceData = pd
+                   pillCid = cid
+                   demotedTimestamp = None)
+              (map snd inputData) newPills

 shouldArchive currentTimestamp record =
-  isSome record.pillCid && currentTimestamp - record.priceData.writeTimestamp > pill_keep_ms
+  isSome record.pillCid && case record.demotedTimestamp of
+    None -> False
+    Some demoted -> currentTimestamp - demoted > pill_keep_ms

+markDemoted currentTimestamp record =
+  case record.demotedTimestamp of
+    None -> record with demotedTimestamp = Some currentTimestamp
+    Some _ -> record

 partitionFeedPills currentTimestamp (newest :: previous :: otherRecords) =
   let
-    toArchive = L.filter (shouldArchive currentTimestamp) otherRecords
-    toKeep = L.filter (\p -> not (shouldArchive currentTimestamp p) && not (shouldDrop p)) otherRecords
+    stamped = map (markDemoted currentTimestamp) otherRecords
+    toArchive = L.filter (shouldArchive currentTimestamp) stamped
+    toKeep = L.filter (\p -> not $ shouldArchive currentTimestamp p || shouldDrop p) stamped
   in (newest :: previous :: toKeep, toArchive)
```

**Why the change**: previously a pill was archivable as soon as `pill_keep_ms` elapsed since its `writeTimestamp`. With infrequent updates, that meant a pill that became "old" (3rd-or-later in its feed list) but never had a successor could be archived prematurely. Now the clock starts when the pill is *demoted* (pushed beyond position #2 by a newer one) — `demotedTimestamp` is stamped on first demotion, then `pill_keep_ms` runs from there.

---

## Internal refactoring (no semantics)

### `adapter/src/Internal/Verify.daml`

```diff
-    Error t -> Error (t <> " for " <> show feedId)
+    Error t -> Error $ t <> " for " <> show feedId
-            | otherwise -> Error ("Wrong timestamps for " <> show feedId)
+            | otherwise -> Error $ "Wrong timestamps for " <> show feedId
```

### `sdk/src/RedStone/Processor.daml`, `Internal/Hex.daml`, `Internal/Der.daml`

Misc `f (g x)` → `f $ g x` cleanup; `(L.chunksOf 2 $ explode hex)` → `$ L.chunksOf 2 $ explode hex`; `("04" <> pubKeyHex)` → `$ "04" <> pubKeyHex`.

### Idiomatic `pure` instead of `return`

Across adapter and tests: `return x` → `pure x` (DAML's `return` is just `pure`; `pure` is the recommended form).

---

## Package version changes

| Package | Before | After |
|---------|--------|-------|
| `redstone-types` | v16-0.4.0 | **v18-0.4.0** |
| `redstone-common` | v16-0.4.0 | **v18-0.4.0** |
| `redstone-featured` | v16-0.4.0 | **v18-0.4.0** |
| `redstone-price-pill` | v16-0.4.0 | **v18-0.4.0** |
| `redstone-price-feed` | v16-0.4.0 | **v18-0.4.0** |
| `redstone-sdk` | v16-0.4.2 | **v18-0.4.0** |
| `redstone-sdk-tests` | v16-0.4.2 | **v18-0.4.0** |
| `redstone-interface` | v17-0.4.0 (was v16) | **v18-0.4.0** |
| `redstone-adapter` | v17-0.4.2 (was v16) | **v18-0.4.0** |
| `redstone-core` | v17-0.4.1 (was v16) | **v18-0.4.0** |
| `redstone-factory` | v17-0.4.0 (was v16) | **v18-0.4.0** |
| `redstone-reward-factory` | v17-0.4.6 (was v16) | **v18-0.4.0** |
| `redstone-test` | v17-0.4.0 (was v16) | **v18-0.4.0** |

All `daml.yaml` files now share `name: redstone-*-v18` and `version: 0.4.0`. All `data-dependencies` references updated. `Makefile`, `deploy.mk`, `test/src/Input.daml`, `scripts/sample-run.ts`, `scripts/core-client-sample.ts`, `tests/test-helpers.ts`, and `src/canton-defs.json` (devnet + localnet sections) updated to match.

> Mainnet section in `canton-defs.json` is left at `v12` — those entries reference contracts already deployed on mainnet and must be regenerated only after redeployment.

After a fresh `daml build --all`, regenerate `daml/package-ids.json` via `make generate-package-ids` (uses `scripts/generate-package-ids.sh` under the hood).
