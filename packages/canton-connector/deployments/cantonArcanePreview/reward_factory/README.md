# RedStone Reward Factory

## Overview

The `RedStoneRewardFactory` is a Canton contract that handles batched creation of `FeaturedAppRight` activity markers
(rewards) for the RedStone oracle adapter. It decouples reward creation from the price pill factory,
allowing rewards to be accumulated and submitted in batches with a configurable time-based throttle.

## Architecture

### How it works

1. The [`RedStoneAdapter`](../adapter/src/RedStoneAdapter.daml) accumulates a pill count in its `RewardState`
   each time new prices are written.
2. When the time since the last reward creation exceeds `min_reward_creation_ms` (configured in
   [`Config.daml`](../adapter/src/Config.daml)), the adapter calls the `RedStoneRewardFactory`
   via the `IRedStoneCore.GetPrices` interface.
3. The pill count is encoded as the length of the `feedIds` parameter (each element is an empty list).
4. The `RedStoneRewardFactory` calculates a weighted reward using [`RewardConfig`](src/RewardConfig.daml)
   and creates a `FeaturedAppActivityMarker` via the `FeaturedAppRight` contract.

### Interface reuse

The `RedStoneRewardFactory` implements the [`IRedStoneCore`](../interface/src/IRedStoneCore.daml) interface
as a temporary measure to avoid introducing a new interface. The `GetPrices` choice is repurposed:
- `feedIds` length encodes the accumulated pill count
- `Time` and `PayloadHex` parameters are unused
- The return value `([], 0)` is ignored by the caller

### Reward weight calculation

The reward weight is calculated in [`RewardConfig.daml`](src/RewardConfig.daml):

```haskell
weight = pillCount * reward_factor_frac_num / reward_factor_frac_den
```

With default values `1/2`, this means each pill contributes `0.5` to the reward weight.

## Contract template

```haskell
template RedStoneRewardFactory
  with
    factoryId: Text        -- Unique identifier for this factory instance
    owner : Party          -- Contract owner (signatory)
    viewers : [Party]      -- Parties that can observe the contract
    beneficiary : Party    -- Party receiving the rewards (signatory)
    featuredCid : RedStoneFeaturedContract  -- FeaturedAppRight contract ID
```

### Signatories

Both `owner` and `beneficiary` are signatories, which means:
- Creating the contract requires authorization from both parties
- The `beneficiary`'s authority enables creating `FeaturedAppActivityMarkers`

## Deployment

### Deploy the reward factory

```bash
make deploy-reward-factory
```

### Update the adapter to use the reward factory

```bash
make update-reward-factory-id
```

### Configuration

- `min_reward_creation_ms`: Minimum interval between reward creation calls (default: 7 minutes)
- `reward_factor_frac_num / reward_factor_frac_den`: Reward weight per pill (default: 1/2 = 0.5)
