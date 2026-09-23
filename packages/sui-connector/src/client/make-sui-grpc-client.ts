import { ChannelCredentials } from "@grpc/grpc-js";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import type { RpcInterceptor, RpcMetadata, RpcOptions } from "@protobuf-ts/runtime-rpc";
import { RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "../config";

export function makeSuiGrpcClient(networkName: SuiNetworkName, url: string, token?: string) {
  if (!token) {
    return new SuiGrpcClient({ baseUrl: url, network: networkName });
  }

  const transport = new GrpcTransport({
    host: new URL(RedstoneCommon.ensureUrlScheme(url)).host,
    channelCredentials: ChannelCredentials.createSsl(),
    interceptors: [makeMetadataInterceptor({ "x-token": token, "x-api-key": token })],
  });

  return new SuiGrpcClient({ transport, network: networkName });
}

function makeMetadataInterceptor(meta: RpcMetadata) {
  const withMeta = (options: RpcOptions) => ({ ...options, meta: { ...options.meta, ...meta } });

  return <RpcInterceptor>{
    interceptUnary: (next, method, input, options) => next(method, input, withMeta(options)),
    interceptServerStreaming: (next, method, input, options) =>
      next(method, input, withMeta(options)),
  };
}
