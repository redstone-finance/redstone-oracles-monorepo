import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { createMqtt5ClientFactory } from "./Mqtt5Client";
import { MultiPubSubClient } from "./MultiPubSubClient";
import { PubSubClientConfig } from "./PubSubClientConfig";
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
      createMqtt5ClientFactory(resolvePubSubEnvConfig(config)),
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

function resolvePubSubEnvConfig(
  config: z.infer<typeof RedundantPubSubEnvConfig>
): PubSubClientConfig {
  switch (config.type) {
    case "mqttAWSV4Sig": {
      return {
        authorization: { type: "AWSSigV4" },
        endpoint: config.host,
      };
    }

    case "mqttCert": {
      return {
        authorization: {
          type: "Cert",
          privateKey: RedstoneCommon.getFromEnv(config.privateKeyEnvPath),
          cert: RedstoneCommon.getFromEnv(config.certEnvPath),
        },
        endpoint: config.host,
      };
    }
  }
}
