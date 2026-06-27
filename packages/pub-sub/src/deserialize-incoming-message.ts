import { ContentTypes, getSerializerDeserializer } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ASYNC_DESERIALIZE, PubSubClient, SubscribeCallback } from "./PubSubClient";

function reportError(
  onMessage: SubscribeCallback,
  client: PubSubClient,
  topicName: string,
  e: unknown
) {
  onMessage(
    topicName,
    null,
    `Error occurred when tried to parse message error=${RedstoneCommon.stringifyError(e)}`,
    client
  );
}

/**
 * Deserializes an incoming pub-sub message payload and dispatches the result to `onMessage`.
 *
 * Shared by every {@link PubSubClient} implementation so the ingestion hot path behaves
 * identically across transports. Honors the `PUB_SUB_ASYNC_DESERIALIZE` flag
 */
export function deserializeAndDispatch(
  topicName: string,
  contentType: ContentTypes | undefined,
  payload: Buffer | Uint8Array,
  onMessage: SubscribeCallback | undefined,
  client: PubSubClient
) {
  if (!onMessage) {
    return;
  }

  let serializer;
  try {
    RedstoneCommon.assert(
      RedstoneCommon.isDefined(contentType),
      "contentType must be set on incoming message"
    );
    serializer = getSerializerDeserializer(contentType);
  } catch (e) {
    reportError(onMessage, client, topicName, e);

    return;
  }

  const buf = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);

  if (ASYNC_DESERIALIZE) {
    serializer
      .deserializeAsync(buf)
      .then((data) => onMessage(topicName, data, null, client))
      .catch((e) => reportError(onMessage, client, topicName, e));

    return;
  }

  let data: unknown;
  try {
    data = serializer.deserialize(buf);
  } catch (e) {
    reportError(onMessage, client, topicName, e);

    return;
  }
  onMessage(topicName, data, null, client);
}
