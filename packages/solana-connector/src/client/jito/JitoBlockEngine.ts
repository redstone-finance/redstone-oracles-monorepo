import { RedstoneCommon } from "@redstone-finance/utils";
import { VersionedTransaction } from "@solana/web3.js";
import { JitoJsonRpcClient } from "jito-js-rpc";

const MAX_BUNDLE_SIZE = 5;
const BUNDLE_ENCODING = "base64";

type JitoRpcResponse<T> = {
  result?: T;
  error?: { code: number; message: string };
};

export class JitoBlockEngine {
  private readonly client: JitoJsonRpcClient;

  constructor(host: string) {
    this.client = new JitoJsonRpcClient(`https://${host}/api/v1`);
  }

  async sendBundle(transactions: VersionedTransaction[]) {
    RedstoneCommon.assert(
      transactions.length <= MAX_BUNDLE_SIZE,
      `Jito bundle exceeds ${MAX_BUNDLE_SIZE} transactions, got ${transactions.length}`
    );

    const encodedTransactions = transactions.map((transaction) =>
      Buffer.from(transaction.serialize()).toString(BUNDLE_ENCODING)
    );

    return unwrap(
      await this.client.sendBundle([encodedTransactions, { encoding: BUNDLE_ENCODING }])
    );
  }

  async getTipAccounts() {
    return unwrap(await this.client.getTipAccounts());
  }
}

function unwrap<T>(response: JitoRpcResponse<T>) {
  if (response.error) {
    throw new Error(`Jito RPC error ${response.error.code}: ${response.error.message}`);
  }

  if (!RedstoneCommon.isDefined(response.result)) {
    throw new Error("Jito RPC returned an empty result");
  }

  return response.result;
}
