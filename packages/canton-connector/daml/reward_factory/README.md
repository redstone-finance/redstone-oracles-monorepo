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
   via the [`IRedStoneRewardFactory.CreateRewards`](../interface/src/IRedStoneRewardFactory.daml) choice.
3. The accumulated pill count is passed directly as the `count` parameter to `CreateRewards`.
4. The `RedStoneRewardFactory` calculates a weighted reward using [`RewardConfig`](src/RewardConfig.daml)
   and creates a `FeaturedAppActivityMarker` via the `FeaturedAppRight` contract.

### Dedicated interface

The `RedStoneRewardFactory` implements the [`IRedStoneRewardFactory`](../interface/src/IRedStoneRewardFactory.daml) interface
with a dedicated `CreateRewards` choice:

```haskell
nonconsuming choice CreateRewards : Decimal
  with
    caller : Party
    count : Int
  controller caller
```

- `count` is the accumulated pill count
- The return value is the calculated reward weight

### Reward weight calculation

The reward weight is calculated in [`RewardConfig.daml`](src/RewardConfig.daml):

```haskell
weight = pillCount * reward_factor_frac_num / reward_factor_frac_den
```

With default values `3/4`, this means each pill contributes `0.75` to the reward weight.

## Contract template

```haskell
template RedStoneRewardFactory
  with
    factoryId: Text        -- Unique identifier for this factory instance
    owner : Party          -- Contract owner (signatory)
    creators : [Party]     -- Parties authorized to create rewards (updaters)
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
- `reward_factor_frac_num / reward_factor_frac_den`: Reward weight per pill (default: 3/4 = 0.75)
