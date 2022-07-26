import Bundlr from "@bundlr-network/client";
import BundlrTransaction from "@bundlr-network/client/build/common/transaction";
import { JWKInterface } from "arweave/node/lib/wallet";
import bundlrDefaults from "./bundlr-defaults.json";
import util from "util";
import { gzip } from "zlib";

export default class BundlrProxy {
  private bundlrClient: Bundlr;

  constructor(jwk: JWKInterface) {
    this.bundlrClient = new Bundlr(
      bundlrDefaults.defaultUrl,
      bundlrDefaults.defaultCurrency,
      jwk
    );
  }

  async prepareSignedTrasaction(data: any): Promise<BundlrTransaction> {
    // Compressing
    const stringifiedData = JSON.stringify(data);
    const gzipPromisified = util.promisify(gzip);
    const compressedData = await gzipPromisified(stringifiedData);

    // Transaction creating and signing
    const tx = this.bundlrClient.createTransaction(compressedData);
    await tx.sign();

    return tx;
  }

  async uploadBundlrTransaction(tx: BundlrTransaction): Promise<void> {
    return await tx.upload();
  }

  async getBalance(): Promise<number> {
    const winstonsBalance = await this.bundlrClient.getLoadedBalance();
    return winstonsBalance.div(10 ** 12).toNumber();
  }
}
