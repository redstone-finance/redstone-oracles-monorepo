import { mqtt5 } from "aws-iot-device-sdk-v2";

export class MqttConfigBuilder {
  protected config: mqtt5.Mqtt5ClientConfig;

  private constructor(hostName: string, port: number) {
    this.config = { hostName, port };
  }

  static newDirectMqttBuilderWithoutAuth(hostName: string, port: number): MqttConfigBuilder {
    return new MqttConfigBuilder(hostName, port);
  }

  withConnectProperties(connectPacket: mqtt5.ConnectPacket) {
    this.config.connectProperties = connectPacket;
    return this;
  }

  withOfflineQueueBehavior(offlineQueueBehavior: mqtt5.ClientOperationQueueBehavior) {
    this.config.offlineQueueBehavior = offlineQueueBehavior;
    return this;
  }

  withSessionBehavior(sessionBehavior: mqtt5.ClientSessionBehavior) {
    this.config.sessionBehavior = sessionBehavior;
    return this;
  }

  withRetryJitterMode(retryJitterMode: mqtt5.RetryJitterType) {
    this.config.retryJitterMode = retryJitterMode;
    return this;
  }

  build() {
    return this.config;
  }
}
