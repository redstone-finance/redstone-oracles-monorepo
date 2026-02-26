import { SuiGrpcClientBuilder } from "./SuiGrpcClientBuilder";
import { SuiJsonRpcClientBuilder } from "./SuiJsonRpcClientBuilder";

export class SuiClientBuilders {
  static clientBuilder() {
    return new SuiGrpcClientBuilder();
  }

  static legacyClientBuilder() {
    return new SuiJsonRpcClientBuilder();
  }
}
