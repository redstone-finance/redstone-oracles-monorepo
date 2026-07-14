import { API_TYPE_JITO, SolanaApi } from "@redstone-finance/solana-connection";
import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { JitoBlockEngine } from "./JitoBlockEngine";
import { JitoBundleClient } from "./JitoBundleClient";

const JITO_SINGLE_EXECUTION_TIMEOUT_MS = RedstoneCommon.secsToMs(1.5);

export function extractJitoHosts(urls: string[]) {
  return (
    RedstoneCommon.splitUrls(urls, SolanaApi.parseUrl)[API_TYPE_JITO]?.map((api) => api.host) ?? []
  );
}

export class BundleClientBuilder extends MultiExecutor.ClientBuilder<JitoBundleClient> {
  protected override chainType = ChainTypeEnum.enum.solana;

  protected override getEligibleUrls() {
    return extractJitoHosts(this.urls);
  }

  build() {
    const blockEngine = this.makeMultiExecutor(
      (host) => new JitoBlockEngine(host),
      {},
      {
        singleExecutionTimeoutMs: JITO_SINGLE_EXECUTION_TIMEOUT_MS,
      }
    );

    return new JitoBundleClient(blockEngine);
  }
}
