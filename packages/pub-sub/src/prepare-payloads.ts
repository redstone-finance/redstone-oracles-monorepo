import { ContentTypes, getSerializerDeserializer } from "@redstone-finance/internal-utils";
import { PubSubPayload } from "./PubSubClient";

/**
 * Serializes each payload once so every client in the fan-out reuses the same bytes
 * instead of re-stringifying and re-compressing independently.
 */
export function preparePayloads(
  payloads: PubSubPayload[],
  contentType: ContentTypes
): PubSubPayload[] {
  const serializer = getSerializerDeserializer(contentType);

  return payloads.map((payload) => {
    const json = JSON.stringify(payload.data);

    return {
      ...payload,
      prepared: {
        json: Buffer.from(json, "utf8"),
        serialized: serializer.serializeRaw(json),
        contentType,
      },
    };
  });
}
