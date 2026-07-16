import { RpcTelemetry } from "@redstone-finance/utils";

const { RpcOpNormalizer } = RpcTelemetry;

export class StellarRpcOpNormalizer extends RpcOpNormalizer {
  override normalize(opName: string, result: unknown) {
    switch (opName) {
      case "getBlockNumber":
        return RpcOpNormalizer.blockNumberTelemetry(result);
      case "call":
      case "simulateOperation":
      case "getContractEntries":
        return RpcOpNormalizer.callTelemetry();
      case "sendTransaction":
        return RpcOpNormalizer.sendTelemetry();
      default:
        return super.normalize(opName, result);
    }
  }
}
