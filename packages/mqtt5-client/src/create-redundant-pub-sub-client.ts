import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { MultiPubSubClient } from "./MultiPubSubClient";
import {
  createMqtt5ClientFactory,
  createSSEClientFactory,
  PubSubClientFactory,
} from "./PubSubClientFactory";
import { RedundantPubSubClient, RedundantPubSubConfig } from "./RedundantPubSubClient";
import { RedundantPubSubEnvConfig, RedundantPubSubEnvConfigs } from "./RedundantPubSubEnvConfig";

export function createRedundantPubSubClientFromEnv(
  envPath = "PUB_SUB_CONFIGS"
): RedundantPubSubClient | undefined {
  const configs = RedstoneCommon.getFromEnv(envPath, RedundantPubSubEnvConfigs.optional());
  if (!configs) {
    return undefined;
  }

  return createRedundantPubSubClient(configs);
}

export function createRedundantPubSubClient(configs: z.infer<typeof RedundantPubSubEnvConfigs>) {
  const redundantPubSubConfigs: RedundantPubSubConfig[] = configs.map((config) => {
    const client = new MultiPubSubClient(
      resolvePubSubClientFactory(config),
      config.expectedRequestPerSecondPerTopic,
      config.host
    );

    return {
      client,
      name: `${config.type}::${config.host}`,
    };
  });

  return new RedundantPubSubClient(redundantPubSubConfigs);
}

function resolvePubSubClientFactory(
  config: z.infer<typeof RedundantPubSubEnvConfig>
): PubSubClientFactory {
  switch (config.type) {
    case "mqttAWSV4Sig": {
      return createMqtt5ClientFactory({
        authorization: { type: "AWSSigV4" },
        endpoint: config.host,
      });
    }

    case "mqttCert": {
      return createMqtt5ClientFactory({
        authorization: {
          type: "Cert",
          privateKey: RedstoneCommon.getFromEnv(config.privateKeyEnvPath),
          cert: RedstoneCommon.getFromEnv(config.certEnvPath),
        },
        endpoint: config.host,
      });
    }

    case "sse": {
      return createSSEClientFactory({
        endpoint: config.host,
      });
    }
  }
}
