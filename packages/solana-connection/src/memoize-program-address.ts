import { RedstoneCommon } from "@redstone-finance/utils";
import { PublicKey } from "@solana/web3.js";

const MAX_ENTRIES = 100_000;
const SEED_SEPARATOR = "|";

const derived = new Map<string, [PublicKey, number]>();
const findProgramAddressSync = PublicKey.findProgramAddressSync.bind(PublicKey);

PublicKey.findProgramAddressSync = (seeds: Array<Buffer | Uint8Array>, programId: PublicKey) => {
  const key = cacheKey(seeds, programId);
  const cached = derived.get(key);
  if (cached) {
    return cached;
  }

  const address = findProgramAddressSync(seeds, programId);
  if (derived.size >= MAX_ENTRIES) {
    derived.clear();
  }
  derived.set(key, address);

  return address;
};

function cacheKey(seeds: Array<Buffer | Uint8Array>, programId: PublicKey) {
  return [programId.toBase58(), ...seeds.map((seed) => RedstoneCommon.hexlify(seed))].join(
    SEED_SEPARATOR
  );
}
