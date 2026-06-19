import { z } from "zod";
import { getFromEnv } from "./env";
import { isDefined } from "./objects";

export const AuthenticatedGatewaySchema = z
  .object({
    url: z.url(),
    apiKeyEnvPath: z
      .string()
      .min(1)
      .superRefine((path, ctx) => {
        if (!isDefined(process.env[path])) {
          ctx.addIssue(`Expected ENV ${path} for authenticated gateway apiKeyEnvPath`);
        }
      }),
  })
  .transform((cfg) => ({
    url: cfg.url,
    apiKey: getFromEnv(cfg.apiKeyEnvPath, z.string().min(1)),
  }));

export type AuthenticatedGateway = z.infer<typeof AuthenticatedGatewaySchema>;
