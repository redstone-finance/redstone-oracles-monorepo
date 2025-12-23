import {
  ContentTypes,
  getSerializerDeserializer,
  LogMonitoring,
  LogMonitoringType,
} from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { auth, iot, mqtt5 } from "aws-iot-device-sdk-v2";
import { randomUUID } from "crypto";
import { MqttConfigBuilder } from "./MqttConfigBuilder";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "./PubSubClient";
import { DEFAULT_CONFIG, MqttPubSubClientConfig } from "./PubSubClientConfig";

const TOPICS_BATCH_LIMIT = 8;

export class Mqtt5Client implements PubSubClient {
  private readonly logger = loggerFactory("mqtt5-client");
  private _mqtt!: mqtt5.Mqtt5Client;
  private readonly config: Required<MqttPubSubClientConfig>;
  private onMessageCallback?: SubscribeCallback;

  private constructor(config: MqttPubSubClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    process.on("beforeExit", () => this.stop());
  }

  getUniqueName(): string {
    return this.config.endpoint;
  }

  static async create(config: MqttPubSubClientConfig): Promise<Mqtt5Client> {
    const client = new Mqtt5Client(config);

    const mqttClientBuilder = Mqtt5Client.createMqttBuilderWithAuthorization(config);

    // Add some default configurations
    mqttClientBuilder
      .withConnectProperties({
        keepAliveIntervalSeconds: 120,
        clientId: randomUUID(),
        sessionExpiryIntervalSeconds: 3600,
      })
      .withOfflineQueueBehavior(mqtt5.ClientOperationQueueBehavior.FailAllOnDisconnect)
      .withSessionBehavior(mqtt5.ClientSessionBehavior.RejoinPostSuccess)
      .withRetryJitterMode(mqtt5.RetryJitterType.Full);

    const clientConfig = mqttClientBuilder.build();

    const mqttClient = new mqtt5.Mqtt5Client(clientConfig);

    mqttClient.start();

    mqttClient.on("error", (error) => {
      client.logger.error("error:", client.getUniqueName(), error);
    });

    mqttClient.on("connectionFailure", (event) => {
      client.logger.error("Connection failure:", client.getUniqueName(), event);
    });

    mqttClient.on("attemptingConnect", () => {
      client.logger.info("Attempting to connect...", client.getUniqueName());
    });

    mqttClient.on("disconnection", (event) => {
      client.logger.error("Disconnected:", client.getUniqueName(), event);
    });

    client._mqtt = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        mqttClient.stop();
        reject(new Error(`Connection timeout ${client.getUniqueName()}`));
      }, client.config.connectionTimeoutMs);

      mqttClient.on("connectionSuccess", () => {
        clearTimeout(timeoutId);
        client.logger.info("Connection successful", client.getUniqueName());
        resolve(mqttClient);
      });
    });

    return client;
  }

  private static createMqttBuilderWithAuthorization(config: MqttPubSubClientConfig) {
    const authType = config.authorization.type;
    switch (authType) {
      case "AWSSigV4": {
        const credentialsProvider = auth.AwsCredentialsProvider.newDefault();
        return iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
          config.endpoint,
          { credentialsProvider }
        );
      }
      case "Cert":
        return iot.AwsIotMqtt5ClientConfigBuilder.newDirectMqttBuilderWithMtlsFromMemory(
          config.endpoint,
          config.authorization.cert,
          config.authorization.privateKey
        );
      case "Unauthenticated":
        return MqttConfigBuilder.newDirectMqttBuilderWithoutAuth(
          config.endpoint,
          config.authorization.port
        );
      default:
        return RedstoneCommon.throwUnsupportedParamError(authType);
    }
  }

  /** publish all data in single batch */
  async publish(payloads: PubSubPayload[], contentType: ContentTypes) {
    const promises = [];
    try {
      this._mqtt.cork();

      const serializer = getSerializerDeserializer(contentType);

      for (const payload of payloads) {
        const encodedMessage = serializer.serialize(payload.data);

        promises.push(
          this._mqtt.publish({
            payload: encodedMessage,
            topicName: payload.topic,
            qos: this.config.qos,
            contentType,
            messageExpiryIntervalSeconds: Math.floor(this.config.messageExpireTimeMs / 1000),
          })
        );
      }
    } finally {
      this._mqtt.uncork();
    }

    await Promise.all(promises);
  }

  /** onMessage is assigned to ALL topics, you can't specify onMessage per topic*/
  async subscribe(topics: string[], onMessage: SubscribeCallback) {
    await this.subscribeToTopics(topics);
    this.onMessageCallback = onMessage;

    if (this._mqtt.listenerCount("messageReceived") === 0) {
      this._mqtt.on("messageReceived", ({ message }) => {
        const topicName = message.topicName;
        let deserializedData: unknown;
        try {
          deserializedData = getSerializerDeserializer(
            message.contentType as ContentTypes
          ).deserialize(Buffer.from(message.payload as ArrayBuffer));
        } catch (e) {
          this.onMessageCallback!(
            topicName,
            null,
            `Error occurred when tried to parse message error=${RedstoneCommon.stringifyError(e)}`,
            this
          );
          return;
        }
        this.onMessageCallback!(message.topicName, deserializedData, null, this);
      });
    }
  }

  /**
   * unsubscribing to not subscribed topics does NOT throw error
   */
  async unsubscribe(topics: string[]) {
    const unsubscribeResponses = [];
    for (let i = 0; i < topics.length; i += TOPICS_BATCH_LIMIT) {
      unsubscribeResponses.push(
        await this._mqtt.unsubscribe({
          topicFilters: topics.slice(i, i + TOPICS_BATCH_LIMIT),
        })
      );
    }

    if (
      unsubscribeResponses
        .flatMap((response) => response.reasonCodes)
        .some((reasonCode) => reasonCode !== mqtt5.UnsubackReasonCode.Success)
    ) {
      throw new Error(`Failed to unsubscribe to topics=${topics.join(", ")}`);
    }
  }

  stop() {
    this._mqtt.stop();
  }

  private async subscribeToTopics(topics: string[]) {
    for (let i = 0; i < topics.length; i += TOPICS_BATCH_LIMIT) {
      const topicsBatch = topics.slice(i, i + TOPICS_BATCH_LIMIT);
      const subscriptionResult = await this._mqtt.subscribe({
        subscriptions: topicsBatch.map((topic) => ({
          topicFilter: topic,
          qos: this.config.qos,
        })),
      });

      if (
        subscriptionResult.reasonCodes.some(
          (reasonCode) => reasonCode > mqtt5.SubackReasonCode.GrantedQoS2
        )
      ) {
        await this.unsubscribe(topics).catch((e) =>
          this.logger.error(RedstoneCommon.stringifyError(e))
        );
        LogMonitoring.throw(
          LogMonitoringType.UNEXPECTED_ERROR,
          `Subscription failed client=${this.getUniqueName()} topics=${topicsBatch.join(",")} reason=${subscriptionResult.reasonString} reasonCodes=${subscriptionResult.reasonCodes.join(", ")}`,
          this.logger
        );
      }
    }
  }
}
