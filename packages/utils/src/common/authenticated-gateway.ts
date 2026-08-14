import { z } from "zod";
import { getFromEnv } from "./env";
import { isDefined } from "./objects";

const authenticatedGatewayBaseSchema = z.object({
  url: z.url(),
  apiKeyEnvPath: z
    .string()
    .min(1)
    .superRefine((path, ctx) => {
      if (!isDefined(process.env[path])) {
        ctx.addIssue(`Expected ENV ${path} for authenticated gateway apiKeyEnvPath`);
      }
    }),
});

export const AuthenticatedGatewaySchema = authenticatedGatewayBaseSchema.transform((cfg) => ({
  url: cfg.url,
  apiKey: getFromEnv(cfg.apiKeyEnvPath, z.string().min(1)),
}));

export type AuthenticatedGateway = z.infer<typeof AuthenticatedGatewaySchema>;

export const RawAuthenticatedGatewaySchema = authenticatedGatewayBaseSchema;

export type RawAuthenticatedGateway = z.infer<typeof RawAuthenticatedGatewaySchema>;

export const getAuthenticatedGatewaysFromEnv = () =>
  getFromEnv("AUTHENTICATED_GATEWAYS", z.array(AuthenticatedGatewaySchema).nonempty().optional());

export const AUTHENTICATED_GATEWAYS_REQUIRED_ERROR =
  "AUTHENTICATED_GATEWAYS env variable must be configured";

export const getRequiredAuthenticatedGatewaysFromEnv = (): AuthenticatedGateway[] => {
  const authenticatedGateways = getAuthenticatedGatewaysFromEnv();
  if (!authenticatedGateways) {
    throw new Error(AUTHENTICATED_GATEWAYS_REQUIRED_ERROR);
  }

  return authenticatedGateways;
};
