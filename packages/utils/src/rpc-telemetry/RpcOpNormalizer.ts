export type RpcOpTelemetry = {
  op: string;
  value?: number;
};

export const RPC_OP = {
  BLOCK_NUMBER: "blockNumber",
  CALL: "call",
  FEE_HISTORY: "feeHistory",
  SEND: "sendRawTransaction",
} as const;

export class RpcOpNormalizer {
  protected static blockNumberTelemetry(result: unknown) {
    return { op: RPC_OP.BLOCK_NUMBER, value: RpcOpNormalizer.asNumber(result) };
  }

  protected static callTelemetry() {
    return { op: RPC_OP.CALL };
  }

  protected static feeHistoryTelemetry(value?: number) {
    return { op: RPC_OP.FEE_HISTORY, value };
  }

  protected static sendTelemetry() {
    return { op: RPC_OP.SEND };
  }

  private static asNumber(result: unknown) {
    return typeof result === "number" ? result : undefined;
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- default passthrough, meant to be overridden per chain
  normalize(opName: string, _result: unknown) {
    return <RpcOpTelemetry>{ op: opName };
  }
}
