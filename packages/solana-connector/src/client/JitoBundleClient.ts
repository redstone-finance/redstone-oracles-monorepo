import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { JitoBlockEngine } from "./JitoBlockEngine";
import { SolanaClient } from "./SolanaClient";

const JITO_TIP_LAMPORTS = 10_000;
const JITO_TIP_JITTER_LAMPORTS = 1_000;
const TIP_ACCOUNTS_TTL_MS = RedstoneCommon.hourToMs(1);

export class JitoBundleClient {
  private readonly fetchTipAccounts: () => Promise<PublicKey[]>;

  constructor(private readonly blockEngine: JitoBlockEngine) {
    this.fetchTipAccounts = RedstoneCommon.memoize({
      functionToMemoize: async () => {
        const accounts = await this.blockEngine.getTipAccounts();

        return accounts.map((account) => new PublicKey(account));
      },
      ttl: TIP_ACCOUNTS_TTL_MS,
    });

    void this.fetchTipAccounts().catch(() => undefined);
  }

  async sendBundle(transactions: VersionedTransaction[], keypair: Keypair) {
    const tipTransaction = SolanaClient.buildTransferTransaction(
      keypair,
      await this.pickTipAccount(),
      JITO_TIP_LAMPORTS + Math.floor(Math.random() * JITO_TIP_JITTER_LAMPORTS),
      transactions[0].message.recentBlockhash
    );

    return await this.blockEngine.sendBundle([...transactions, tipTransaction]);
  }

  private async pickTipAccount() {
    const tipAccounts = await this.fetchTipAccounts();

    return tipAccounts[Math.floor(Math.random() * tipAccounts.length)];
  }
}
