export const MOVE_DECIMALS = 8;
export const OCTAS_PER_MOVE = 10 ** MOVE_DECIMALS;
export const DEFAULT_BROADCAST_BUCKETS = [
  0, 150, 300, 500, 1000, 3000, 5000, 10000, 100000, 1000000,
]; // https://github.com/aptos-labs/aptos-core/blob/30b385bf38d3dc8c4e8ee0ff045bc5d0d2f67a85/config/src/config/mempool_config.rs#L8
export const MAX_ITERATION_ATTEMPTS = DEFAULT_BROADCAST_BUCKETS.length - 1;
