import { RpcTelemetry } from "@redstone-finance/utils";

const { RpcOpNormalizer } = RpcTelemetry;

export class SuiRpcOpNormalizer extends RpcOpNormalizer {
  override normalize(opName: string, result: unknown) {
    switch (opName) {
      case "getBlockNumber":
        return RpcOpNormalizer.blockNumberTelemetry(result);
      case "getObject":
      case "getObjects":
      case "getDynamicFieldValue":
      case "listDynamicFields":
        return RpcOpNormalizer.callTelemetry();
      case "signAndExecuteTransaction":
        return RpcOpNormalizer.sendTelemetry();
      default:
        return super.normalize(opName, result);
    }
  }
}
