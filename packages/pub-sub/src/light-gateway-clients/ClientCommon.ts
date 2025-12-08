import { encode } from "@msgpack/msgpack";
import { HttpClient } from "@redstone-finance/http-client";
import { DeflateJson } from "@redstone-finance/internal-utils";
import { RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";
import { PubSubPayload } from "../PubSubClient";
import { POST_DATA_ROUTE } from "./routes";

export type SerializedPackage = {
  topic: string;
  data: Buffer;
};

const BASE64_ENCODING = "base64";
const CONTENT_TYPE_MSGPACK = "application/msgpack";

export class ClientCommon {
  private readonly serializerDeserializer: DeflateJson = new DeflateJson();

  constructor(
    private readonly httpClient: HttpClient,
    public readonly lightGatewayAddress: string,
    private readonly logger: RedstoneLogger
  ) {
    if (!lightGatewayAddress.startsWith("http://") && !lightGatewayAddress.startsWith("https://")) {
      this.lightGatewayAddress = `http://${lightGatewayAddress}`;
    }
    this.lightGatewayAddress = this.lightGatewayAddress.endsWith("/")
      ? this.lightGatewayAddress.slice(0, -1)
      : this.lightGatewayAddress;
  }

  static encodePackages(packages: SerializedPackage[]) {
    return Buffer.from(encode(packages));
  }

  serializePayload(payload: PubSubPayload) {
    return {
      topic: payload.topic,
      data: this.serializerDeserializer.serialize(payload.data),
    };
  }

  deserializeData(base64Data: string) {
    return this.serializerDeserializer.deserialize(Buffer.from(base64Data, BASE64_ENCODING));
  }

  getUrl(route: string) {
    return `${this.lightGatewayAddress}/${route}`;
  }

  getPublishUrl() {
    return `${this.lightGatewayAddress}/${POST_DATA_ROUTE}`;
  }

  async publish(payloads: PubSubPayload[]) {
    const packages = payloads.map((payload) => this.serializePayload(payload));
    const encoded = ClientCommon.encodePackages(packages);

    this.logger.info("Sending encoded data", { byteLength: encoded.length });
    try {
      await this.httpClient.post(this.getPublishUrl(), encoded, {
        headers: { "Content-Type": CONTENT_TYPE_MSGPACK },
      });
      this.logger.info("Published data successfully", { count: packages.length });
    } catch (e) {
      this.logger.error("Failed to publish data", {
        error: RedstoneCommon.stringifyError(e),
        count: packages.length,
      });
      throw e;
    }
  }
}
