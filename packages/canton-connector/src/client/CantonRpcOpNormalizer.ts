import { RpcTelemetry } from "@redstone-finance/utils";

const { RpcOpNormalizer } = RpcTelemetry;

export class CantonRpcOpNormalizer extends RpcOpNormalizer {
  override normalize(opName: string, result: unknown) {
    switch (opName) {
      case "getCurrentOffset":
        return RpcOpNormalizer.blockNumberTelemetry(result);
      case "getActiveContractsData":
      case "getActiveContractData":
      case "getMostActiveContractData":
        return RpcOpNormalizer.callTelemetry();
      case "exerciseChoices":
      case "exerciseChoicesWithoutWaiting":
        return RpcOpNormalizer.sendTelemetry();
      default:
        return super.normalize(opName, result);
    }
  }
}
