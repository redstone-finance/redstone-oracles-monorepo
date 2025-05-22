import {
  AnchorProvider,
  setProvider,
  web3,
  workspace,
  type Program,
} from "@coral-xyz/anchor";
import { expect } from "chai";
import { RedstoneSolanaPriceAdapter } from "../target/types/redstone_solana_price_adapter";
import {
  makeFeedIdBytes,
  makePayload,
  makePriceSeed,
  printComputeUnitsUsed,
} from "./util";

describe("redstone-sol", () => {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const program =
    workspace.RedstoneSolanaPriceAdapter as Program<RedstoneSolanaPriceAdapter>;

  const feedIds = [
    "AVAX",
    "BTC",
    "CRV",
    "DAI",
    "ETH",
    "EUROC",
    "LINK",
    "SOL",
    "USDC",
    "USDT",
    "EUR",
  ];

  const pdas: { [id: string]: web3.PublicKey } = {};
  const systemProgram = web3.SystemProgram.programId;

  before(async () => {
    for (const feedId of feedIds) {
      pdas[feedId] = web3.PublicKey.findProgramAddressSync(
        [makePriceSeed(), makeFeedIdBytes(feedId)],
        program.programId
      )[0];
    }
  });

  async function testFeedIdPush(feedId: string) {
    it(`Updates correctly for ${feedId} feed`, async () => {
      const payload = await makePayload([feedId]);
      const feedIdBytes = makeFeedIdBytes(feedId);
      const priceAccount = pdas[feedId];
      const tx = await program.methods
        .writePrice(Array.from(feedIdBytes), payload)
        .accountsStrict({
          user: provider.wallet.publicKey,
          priceAccount,
          systemProgram,
        })
        .rpc({ skipPreflight: false });

      await printComputeUnitsUsed(provider, tx);

      const priceAccountData =
        await program.account.priceData.fetch(priceAccount);

      expect(
        Buffer.from(priceAccountData.feedId)
          .toString("utf8")
          .replace(/\0+$/, "")
      ).to.equal(feedId);
      expect(priceAccountData.value).to.not.equal("0");

      console.log(`${feedId}: ${JSON.stringify(priceAccountData)}`);
    });
  }

  feedIds.forEach(testFeedIdPush);
});
