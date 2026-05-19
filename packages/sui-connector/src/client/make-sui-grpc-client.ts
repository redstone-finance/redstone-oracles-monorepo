import { ChannelCredentials } from "@grpc/grpc-js";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import type { RpcMetadata, RpcOptions, RpcTransport } from "@protobuf-ts/runtime-rpc";
import { RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "../config";

export function makeSuiGrpcClient(networkName: SuiNetworkName, url: string, token?: string) {
  if (!token) {
    return new SuiGrpcClient({ baseUrl: url, network: networkName });
  }

  const host = new URL(RedstoneCommon.ensureUrlScheme(url)).host;
  const transport = new GrpcTransport({
    host,
    channelCredentials: ChannelCredentials.createSsl(),
  });

  const authedTransport = withGrpcMetadata(transport, { "x-token": token, "x-api-key": token });

  return new SuiGrpcClient({
    transport: authedTransport,
    network: networkName,
  });
}

function withGrpcMetadata(transport: RpcTransport, meta: RpcMetadata) {
  const addMeta = (options?: RpcOptions): RpcOptions => ({
    ...options,
    meta: { ...options?.meta, ...meta },
  });

  return new Proxy(transport, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver) as unknown;
      if (typeof original !== "function") {
        return original;
      }

      return function (...args: unknown[]) {
        for (let i = args.length - 1; i >= 0; i--) {
          if (isRpcOptionsLike(args[i])) {
            args[i] = addMeta(args[i] as RpcOptions | undefined);
            return (original as (...a: unknown[]) => unknown).apply(target, args);
          }
        }
        throw new Error(`No RpcOptions slot found for transport method "${String(prop)}"`);
      };
    },
  });
}

function isRpcOptionsLike(x: unknown) {
  if (x === undefined) {
    return true;
  }
  if (typeof x !== "object" || x === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(x) as object | null;

  return proto === Object.prototype || proto === null;
}
