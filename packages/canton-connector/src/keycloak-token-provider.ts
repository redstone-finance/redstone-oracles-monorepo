import axios from "axios";
import { KeycloakTokenProviderParams, makeKeycloakParams } from "./KeycloakTokenProviderParams";

export async function keycloakTokenProvider(opts?: KeycloakTokenProviderParams | string) {
  const { url, realm, clientId, username, password } = makeKeycloakParams(opts);

  const { data } = await axios.post<{ access_token: string }>(
    `${url}/auth/realms/${realm}/protocol/openid-connect/token`,
    {
      grant_type: "password",
      client_id: clientId,
      username: username,
      password: password,
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return data.access_token;
}
