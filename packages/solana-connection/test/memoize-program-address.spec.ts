import { PublicKey } from "@solana/web3.js";
import "../src/memoize-program-address";

const PROGRAM = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const POOL = new PublicKey("5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6");
const OTHER_PROGRAM = new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
const HIGHEST_BUMP = 255;

describe("memoized findProgramAddressSync", () => {
  let derivations: jest.SpyInstance;

  beforeEach(() => {
    derivations = jest.spyOn(PublicKey, "createProgramAddressSync");
  });

  afterEach(() => {
    derivations.mockRestore();
  });

  it("tries one bump after another the first time and none on the repeat", () => {
    const seeds = [Buffer.from("bin_array"), POOL.toBuffer()];
    const [first, bump] = PublicKey.findProgramAddressSync(seeds, PROGRAM);

    expect(derivations).toHaveBeenCalledTimes(HIGHEST_BUMP - bump + 1);

    derivations.mockClear();
    const [second, secondBump] = PublicKey.findProgramAddressSync(seeds, PROGRAM);

    expect(derivations).toHaveBeenCalledTimes(0);
    expect(second.toBase58()).toBe(first.toBase58());
    expect(secondBump).toBe(bump);
  });

  it("counts the bumps again when the seeds differ", () => {
    const pool = POOL.toBuffer();
    PublicKey.findProgramAddressSync([Buffer.from("oracle"), pool], PROGRAM);
    derivations.mockClear();
    const [, bump] = PublicKey.findProgramAddressSync([Buffer.from("position"), pool], PROGRAM);

    expect(derivations).toHaveBeenCalledTimes(HIGHEST_BUMP - bump + 1);
  });

  it("counts the bumps again when the program differs", () => {
    const seeds = [Buffer.from("reward"), POOL.toBuffer()];
    PublicKey.findProgramAddressSync(seeds, PROGRAM);
    derivations.mockClear();
    const [, bump] = PublicKey.findProgramAddressSync(seeds, OTHER_PROGRAM);

    expect(derivations).toHaveBeenCalledTimes(HIGHEST_BUMP - bump + 1);
  });

  it("returns what solana would return", () => {
    const seeds = [Buffer.from("bitmap"), POOL.toBuffer()];
    const [address, bump] = PublicKey.findProgramAddressSync(seeds, PROGRAM);

    expect(
      address.equals(PublicKey.createProgramAddressSync([...seeds, Buffer.from([bump])], PROGRAM))
    ).toBe(true);
  });

  it("follows solana in ignoring where the seeds are split", () => {
    const [joined] = PublicKey.findProgramAddressSync(
      [Buffer.from("ab"), Buffer.from("c")],
      PROGRAM
    );
    const [split] = PublicKey.findProgramAddressSync(
      [Buffer.from("a"), Buffer.from("bc")],
      PROGRAM
    );

    expect(split.toBase58()).toBe(joined.toBase58());
  });
});
