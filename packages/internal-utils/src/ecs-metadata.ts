import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";

const logger = loggerFactory("ecs-metadata");

export interface EcsTaskIdentity {
  serviceName: string;
  taskId: string;
  region: string;
  dockerTag: string;
}

async function fetchTaskMetadata(): Promise<EcsTaskIdentity> {
  const metadataUri = process.env["ECS_CONTAINER_METADATA_URI_V4"]!;
  const res = await RedstoneCommon.fetchWithFallbacks<{
    ServiceName?: string;
    TaskARN?: string;
    Containers?: Array<{ Name?: string; ImageID?: string }>;
  }>({
    urls: [`${metadataUri}/task`],
    axiosConfig: { timeout: 2_000 },
  });
  const body = res.data;

  if (!body.ServiceName || !body.TaskARN) {
    throw new Error(`Unexpected ECS metadata response: ${JSON.stringify(body)}`);
  }

  // TaskARN format: arn:aws:ecs:<region>:<account>:task/<cluster>/<taskId>
  const region = body.TaskARN.split(":")[3];
  if (!region) {
    throw new Error(`Could not parse region from TaskARN: ${body.TaskARN}`);
  }

  const containers = body.Containers ?? [];
  const container = containers.find((c) => c.Name?.endsWith("-container")) ?? containers.at(0);
  const dockerTag = container?.ImageID ?? "unknown";

  return {
    serviceName: body.ServiceName,
    taskId: body.TaskARN.split("/").at(-1)!,
    region,
    dockerTag,
  };
}

/**
 * Fetches task identity from the ECS container metadata endpoint.
 * ECS_CONTAINER_METADATA_URI_V4 must be set: ECS sets it automatically,
 * or set it to "local" for local development.
 * Throws on missing env var or failed fetch after retries — never emits misleading telemetry.
 */
export async function fetchEcsTaskIdentity(): Promise<EcsTaskIdentity> {
  try {
    const metadataUri = RedstoneCommon.getFromEnv(
      "ECS_CONTAINER_METADATA_URI_V4",
      z.string().default("local")
    );
    if (metadataUri === "local") {
      return {
        serviceName: "local",
        taskId: process.env["HOSTNAME"] ?? "local",
        region: "local",
        dockerTag: "local",
      };
    }
    if (!metadataUri) {
      throw new Error(
        "ECS_CONTAINER_METADATA_URI_V4 is not set. It should be set by ECS automatically. Set it to 'local' for local development."
      );
    }

    return await RedstoneCommon.executeWithRetries(
      {
        fn: fetchTaskMetadata,
        fnName: "fetchTaskMetadata",
        maxRetries: 3,
        waitBetweenMs: 500,
        backOff: { backOffBase: 2 },
        logger: (msg) => logger.error(msg),
      },
      []
    );
  } catch (e) {
    logger.error("Failed to fetch ECS identity.", e);

    throw e;
  }
}
