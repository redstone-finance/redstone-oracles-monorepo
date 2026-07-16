import { RpcTelemetry } from "@redstone-finance/utils";
import { RecentPrioritizationFees } from "@solana/web3.js";

const { RpcOpNormalizer } = RpcTelemetry;

export class SolanaRpcOpNormalizer extends RpcOpNormalizer {
  private static maxPrioritizationFee(result: unknown) {
    if (!Array.isArray(result)) {
      return undefined;
    }
    const fees = (result as RecentPrioritizationFees[]).map((entry) => entry.prioritizationFee);

    return fees.length > 0 ? Math.max(...fees) : undefined;
  }

  override normalize(opName: string, result: unknown) {
    switch (opName) {
      case "getSlot":
      case "getBlockHeight":
        return RpcOpNormalizer.blockNumberTelemetry(result);
      case "getAccountInfo":
      case "getMultipleAccountsInfo":
      case "viewMethod":
        return RpcOpNormalizer.callTelemetry();
      case "getRecentPrioritizationFees":
        return RpcOpNormalizer.feeHistoryTelemetry(
          SolanaRpcOpNormalizer.maxPrioritizationFee(result)
        );
      case "sendTransaction":
      case "sendBundle":
        return RpcOpNormalizer.sendTelemetry();
      default:
        return super.normalize(opName, result);
    }
  }
}
