# RedStone Reward Factory

## Overview

> **Being retired.** CIP-0104 replaces the `FeaturedAppActivityMarker` / `AppRewardCoupon` model with
> traffic-based app rewards accounted for by the network itself.

The `RedStoneRewardFactory` is a Canton contract that handles batched creation of `FeaturedAppRight` activity markers
(rewards) for the RedStone oracle adapter. It decouples reward creation from the price pill factory,
allowing rewards to be accumulated and submitted in batches with a configurable time-based throttle.

## Architecture

### How it works

1. The [`RedStoneAdapter`](../adapter/src/RedStoneAdapter.daml) accumulates `paidTrafficCost` — the traffic
   cost in **bytes**, measured off-ledger and passed in via `WritePricesContext` — in its `RewardState`
   each time new prices are written.
2. When the time since the last reward creation exceeds `min_reward_creation_ms` (configured in
   [`RedStoneAdapter/Config.daml`](../adapter/src/RedStoneAdapter/Config.daml)) **and** the accumulated cost is
   greater than zero, the adapter calls the `RedStoneRewardFactory` via the
   [`IRedStoneRewardFactory.CreateRewards`](../interface/src/IRedStoneRewardFactory.daml) choice
   (see [`Internal/Rewards.daml`](../adapter/src/Internal/Rewards.daml)).
3. The accumulated byte count is passed as the `count` parameter to `CreateRewards`, and `RewardState` is reset.
4. The `RedStoneRewardFactory` calculates a weighted reward using [`RewardConfig`](src/RewardConfig.daml)
   and — only if the weight reaches `1.0` — creates a `FeaturedAppActivityMarker` via the `FeaturedAppRight`
   contract. Below that it returns `0.0` and creates nothing.

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

- `count` is the accumulated traffic cost in bytes
- The return value is the calculated reward weight, or `0.0` when no marker was created

### Reward weight calculation

The reward weight is calculated in [`RewardConfig.daml`](src/RewardConfig.daml) from the accumulated traffic
cost in bytes, with `reward_min_count` (5 kB, the marker's own estimated cost) subtracted first:

```haskell
rewardWeight total =
   if total > reward_min_count then
     intToDecimal ((total - reward_min_count) * reward_factor_frac_num) / intToDecimal reward_factor_frac_den
   else
     0.0
```

With the current constants (`one_mb_price = 60`, factor 1.15) that is ≈69 per MB of traffic. The factory only
creates a marker once the weight reaches `1.0`; below that it returns `0.0` and creates nothing.

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
- `reward_factor_frac_num / reward_factor_frac_den`: Reward weight per byte of traffic
  (default: `60 * 115 / (1 MB * 100)`, i.e. ≈69 per MB)
- `reward_min_count`: Traffic not rewarded, covering the marker's own cost (default: 5 kB)
