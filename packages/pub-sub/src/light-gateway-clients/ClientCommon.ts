import { encode } from "@msgpack/msgpack";
import { HttpClient } from "@redstone-finance/http-client";
import { DeflateJson } from "@redstone-finance/internal-utils";
import { RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";
import { PubSubPayload } from "../PubSubClient";
import { buildBatchBody, lazyBatches } from "./batch_framing";
import { POST_DATA_BATCH_ROUTE, VERSION_ROUTE } from "./routes";

const CONTENT_TYPE_MSGPACK = "application/msgpack";
const CONTENT_TYPE_OCTET_STREAM = "application/octet-stream";

export type GatewayVersion = "v1" | "legacy";

export class ClientCommon {
  private readonly serializerDeserializer: DeflateJson = new DeflateJson();
  private gatewayVersion?: GatewayVersion;

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

  async getGatewayVersion(): Promise<GatewayVersion> {
    if (!this.gatewayVersion) {
      try {
        const response = await this.httpClient.get<string>(this.getUrl(VERSION_ROUTE));

        this.gatewayVersion = response.data === "v1" ? "v1" : "legacy";
      } catch {
        this.gatewayVersion = "legacy";
      }
    }

    return this.gatewayVersion;
  }

  serializePayload(payload: PubSubPayload) {
    return {
      topic: payload.topic,
      data: this.serializerDeserializer.serialize(payload.data),
    };
  }

  deserializeData(base64Data: string) {
    return this.serializerDeserializer.deserialize(Buffer.from(base64Data, "base64"));
  }

  getUrl(route: string) {
    return `${this.lightGatewayAddress}/${route}`;
  }

  async publish(payloads: PubSubPayload[]) {
    const version = await this.getGatewayVersion();

    if (version === "legacy") {
      return await this.publishLegacy(payloads);
    }

    await this.publishV1(payloads);
  }

  private async publishV1(payloads: PubSubPayload[]) {
    const toFrame = (payload: PubSubPayload) => {
      const { topic, data } = this.serializePayload(payload);

      return {
        topicBytes: Buffer.from(topic, "utf8"),
        dataB64: Buffer.from(data.toString("base64"), "ascii"),
      };
    };

    for (const batch of lazyBatches(payloads, toFrame)) {
      const body = buildBatchBody(batch);

      this.logger.debug("Publishing data", { byteLength: body.byteLength, count: batch.length });

      try {
        await this.httpClient.post(this.getUrl(POST_DATA_BATCH_ROUTE), body, {
          headers: { "Content-Type": CONTENT_TYPE_OCTET_STREAM },
        });
      } catch (e) {
        this.logger.error("Failed to publish data", {
          error: RedstoneCommon.stringifyError(e),
          count: batch.length,
        });

        throw e;
      }
    }
  }

  private async publishLegacy(payloads: PubSubPayload[]) {
    const packages = payloads.map((payload) => this.serializePayload(payload));
    const encoded = Buffer.from(encode(packages));

    this.logger.debug("Publishing data (legacy)", {
      byteLength: encoded.length,
      count: packages.length,
    });

    try {
      await this.httpClient.post(this.getUrl(POST_DATA_BATCH_ROUTE), encoded, {
        headers: { "Content-Type": CONTENT_TYPE_MSGPACK },
      });
    } catch (e) {
      this.logger.error("Failed to publish data", {
        error: RedstoneCommon.stringifyError(e),
        count: packages.length,
      });

      throw e;
    }
  }
}
