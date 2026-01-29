import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";

export type KeycloakTokenProviderParams = z.infer<typeof KeycloakTokenProviderParamsSchema>;
const KeycloakTokenProviderParamsSchema = z.object({
  url: z.url(),
  realm: z.string(),
  clientId: z.string(),
  username: z.string(),
  password: z.string(),
});

export function makeKeycloakParams(opts?: KeycloakTokenProviderParams | string) {
  const schema = z
    .string()
    .transform((s) => Buffer.from(s, "base64").toString())
    .transform((s) => JSON.parse(s) as object)
    .pipe(KeycloakTokenProviderParamsSchema);

  const options = typeof opts === "string" ? schema.parse(opts) : opts;

  return options ?? readKeycloakParams();
}

export function encodeKeycloakParams(opts = readKeycloakParams()) {
  return Buffer.from(JSON.stringify(opts)).toString("base64");
}

function readKeycloakParams(): KeycloakTokenProviderParams {
  return {
    url: RedstoneCommon.getFromEnv("KEYCLOAK_URL", z.url()),
    realm: RedstoneCommon.getFromEnv("REALM"),
    clientId: RedstoneCommon.getFromEnv("CLIENT_ID"),
    username: RedstoneCommon.getFromEnv("KEYCLOAK_USERNAME"),
    password: RedstoneCommon.getFromEnv("KEYCLOAK_PASSWORD"),
  };
}
