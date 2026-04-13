# Changelog: DAML v12 → v16

---

## Summary

Major refactoring of reward system, interface segregation, and access control improvements.

| Area | Change type |
|------|------------|
| Reward system | Extracted from PricePillFactory into dedicated RewardFactory |
| Interfaces | New `IRedStoneRewardFactory`, viewer verification added across all interfaces |
| Adapter | `IRedStoneCore` implemented, reward state management, admin choices |
| Core | Conditional viewer verification (`shouldVerifyViewer`) |
| Package version | v12 → v16 |
| Splice API | FeaturedAppRightV1 → FeaturedAppRightV2 (weighted rewards) |

---

## New files

| File | Description |
|------|-------------|
| `interface/src/IRedStoneRewardFactory.daml` | New interface for batched reward creation with `CreateRewards` choice |
| `reward_factory/src/RedStoneRewardFactory.daml` | Template implementing `IRedStoneRewardFactory` via `FeaturedAppRight` |
| `reward_factory/src/RewardConfig.daml` | Reward weight calculation (`3/4` per pill) |
| `adapter/src/Internal/Rewards.daml` | Reward state accumulation and batched creation logic |

## Renamed files (adapter internal reorganization)

| Old path | New path |
|----------|----------|
| `adapter/src/Events.daml` | `adapter/src/Internal/Events.daml` |
| `adapter/src/PillRecord.daml` | `adapter/src/Internal/PillRecord.daml` |
| `adapter/src/ProcessPayload.daml` | `adapter/src/Internal/ProcessPayload.daml` |
| `adapter/src/Verify.daml` | `adapter/src/Internal/Verify.daml` |

---

## Interface changes

### `IRedStoneCore`

```diff
 interface IRedStoneCore where
   viewtype RedStoneCoreView

-  iRedStoneCore_GetPricesImpl : [RedStoneFeedId] -> Time -> PayloadHex -> Update RedStoneResult
+  iRedStoneCore_ShouldVerifyViewer : Party -> Bool
+  iRedStoneCore_VerifyViewer : Party -> Update ()
+  iRedStoneCore_GetPricesImpl : Party -> [RedStoneFeedId] -> Time -> PayloadHex -> Update RedStoneResult

   nonconsuming choice GetPrices : RedStoneResult
     ...
     do
-      iRedStoneCore_GetPricesImpl this feedIds currentTime payloadHex
+      if iRedStoneCore_ShouldVerifyViewer this caller then
+         iRedStoneCore_VerifyViewer this caller
+      else
+         pure ()
+      iRedStoneCore_GetPricesImpl this caller feedIds currentTime payloadHex
```

### `IRedStoneAdapter`

```diff
 interface IRedStoneAdapter where
+  iRedStoneAdapter_VerifyViewer : Party -> Update ()
   iRedStoneAdapter_VerifyUpdater : Party -> Update ()
-  iRedStoneAdapter_GetPricesImpl : [RedStoneFeedId] -> Time -> PayloadHex -> Update RedStoneResult
   iRedStoneAdapter_WritePricesImpl : ...

-  -- GetPrices choice REMOVED from IRedStoneAdapter
-  -- (adapter now implements IRedStoneCore directly)

   -- All read choices now verify viewer:
   nonconsuming choice ReadPrices ...
     do
-      iRedStoneAdapter_ReadPricesImpl this feedIds
+      iRedStoneAdapter_VerifyViewer this caller
+        >> iRedStoneAdapter_ReadPricesImpl this feedIds

   -- Same pattern for ReadPriceData, GetUniqueSignerThreshold
```

### `IRedStonePricePill`

```diff
 interface IRedStonePricePill where
+  iRedStonePricePill_VerifyViewer: Party -> Update ()

   nonconsuming choice ReadData ...
     do
-      iRedStonePricePill_AssertDataNotStaleImpl this
-      pure (view this).priceData
+      iRedStonePricePill_VerifyViewer this caller
+        >> iRedStonePricePill_AssertDataNotStaleImpl this
+        >> pure (view this).priceData

   -- Same for ReadPrice
```

### `IRedStonePricePillFactory`

```diff
   -- Choices now use >> operator instead of _ <- pattern:
   nonconsuming choice CreatePricePills ...
     do
-      _ <- iRedStonePricePillFactory_VerifyCreator this caller
-      iRedStonePricePillFactory_CreatePricePillsImpl ...
+      iRedStonePricePillFactory_VerifyCreator this caller
+        >> iRedStonePricePillFactory_CreatePricePillsImpl ...
```

### `IRedStoneRewardFactory` (NEW)

```haskell
interface IRedStoneRewardFactory where
  viewtype RedStoneRewardFactoryView

  iRedStoneRewardFactory_VerifyCreator: Party -> Update ()
  iRedStoneRewardFactory_CreateRewardsImpl: Int -> Update Decimal

  nonconsuming choice CreateRewards : Decimal
    with
      caller : Party
      count : Int
    controller caller
    do
      iRedStoneRewardFactory_VerifyCreator this caller
        >> iRedStoneRewardFactory_CreateRewardsImpl this count
```

---

## Template changes

### `RedStoneCore`

```diff
 template RedStoneCore
   with
     coreId: Text
     owner : Party
     viewers : [Party]
+    shouldVerifyViewer : Bool
     beneficiary : Optional Party
     featuredCid : Optional RedStoneFeaturedContract

+    iRedStoneCore_ShouldVerifyViewer caller = shouldVerifyViewer
+    iRedStoneCore_VerifyViewer caller = assertMsg "GetPrices: caller must be a viewer" $ caller `elem` viewers
-    iRedStoneCore_GetPricesImpl feedIds currentTime payloadHex = do
+    iRedStoneCore_GetPricesImpl caller feedIds currentTime payloadHex = do
```

### `RedStoneAdapter`

```diff
 template RedStoneAdapter
   with
     ...
     pillFactory : Optional (ContractId IRedStonePricePillFactory)
+    rewardState: Optional RewardState
+    rewardFactory : Optional (ContractId IRedStoneRewardFactory)

+    -- Now implements IRedStoneCore (GetPrices moved here from IRedStoneAdapter)
+    interface instance IRedStoneCore for RedStoneAdapter where
+      iRedStoneCore_ShouldVerifyViewer _ = True
+      iRedStoneCore_VerifyViewer caller = assertMsg "..." $ caller `elem` (viewers ++ updaters)
+      iRedStoneCore_GetPricesImpl caller feedIds currentTime payloadHex =
+        maybeCreateRewardsWithoutState caller rewardFactory (length feedIds)
+          >> G.getPricesNumeric (adapter_config_fun feedIds currentTime) payloadHex

+    iRedStoneAdapter_VerifyViewer caller = assertMsg "..." $ caller `elem` (viewers ++ updaters)

+    -- New admin choices:
+    choice UpdatePillFactory : ContractId RedStoneAdapter
+    choice UpdateRewardFactory : ContractId RedStoneAdapter
+    choice UnlinkAllPills : ([ContractId IRedStonePricePill], ContractId RedStoneAdapter)
```

### `RedStonePricePillFactory`

```diff
 template RedStonePricePillFactory
   with
     factoryId: Text
     owner : Party
     creators : [Party]
-    beneficiary : Party
-    featuredCid : RedStoneFeaturedContract
   where
-    signatory owner, beneficiary
+    signatory owner
     observer creators

-      -- No longer calls takeReward per pill (rewards moved to RewardFactory)
```

### `RedStonePricePill`

```diff
+      iRedStonePricePill_VerifyViewer caller = assertMsg "Read: Caller must be a viewer or a creator" $ caller `elem` (viewers ++ creators)
-      iRedStonePricePill_VerifyArchiver caller = do
-        assertMsg "Caller must be a creator" $ caller `elem` creators
+      iRedStonePricePill_VerifyArchiver caller = assertMsg "ArchivePill: Caller must be a creator" $ caller `elem` creators
```

### `Featured`

```diff
-import Splice.Api.FeaturedAppRightV1
+import Splice.Api.FeaturedAppRightV2

-takeReward beneficiary featuredAppRightCid =
+takeRewards rewardWeight beneficiary featuredAppRightCid =
     do
         _ <- exercise featuredAppRightCid FeaturedAppRight_CreateActivityMarker with
             beneficiaries = [AppRewardBeneficiary with beneficiary, weight = 1.0]
+            weight = Some rewardWeight
         return ()
+
+takeReward beneficiary featuredAppRightCid = takeRewards 1.0 beneficiary featuredAppRightCid
```

---

## Internal refactoring

### `adapter/src/Internal/ProcessPayload.daml`

- Extracted `WriteContext`, `Factories`, `AdapterState` data types (replacing tuple parameters)
- `processAndWritePrices` now takes `Factories` (with `rewardFactory`) and `AdapterState` (with `rewardState`)
- Calls `maybeCreateRewards` after writing new prices
- Returns `AdapterState` instead of just `feedData`

### `adapter/src/Internal/Rewards.daml` (NEW)

- `RewardState` tracks `accumulatedPillCount` and `lastCreateTimestamp`
- `maybeCreateRewards` accumulates pill counts and batches `CreateRewards` calls (throttled by `min_reward_creation_ms` = 7 min)
- `maybeCreateRewardsWithoutState` — stateless variant used by `IRedStoneCore.GetPrices` on adapter

### `adapter/src/Config.daml`

```diff
+min_reward_creation_ms = 7 * one_min_ms
```

---

## Package version changes

All `daml.yaml` files: `name: redstone-*-v12` → `name: redstone-*-v16`

All data-dependencies updated accordingly (`.dar` file references).

## Splice API migration

`FeaturedAppRightV1` → `FeaturedAppRightV2` across all files. V2 adds optional `weight` parameter to `FeaturedAppRight_CreateActivityMarker`.
