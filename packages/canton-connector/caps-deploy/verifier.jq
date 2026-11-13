def microseconds($ms): {microseconds: ($ms | tonumber * 1000 | tostring)};

{
  owner: $operator,
  observers: [$viewer],
  signers: $config[0].signers,
  signerCountThreshold: $config[0].signerCountThreshold,
  feedIds: ($feedIds | split(" ")),
  attestationKeys: ($attestationKeys | split(" ")),
  maxBehind: microseconds($config[0].maxAllowedPackageTimestampDelayMs),
  maxAhead: microseconds($config[0].maxAllowedPackageTimestampAheadMs)
}
