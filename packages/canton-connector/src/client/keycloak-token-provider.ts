import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { KeycloakTokenProviderParams, makeKeycloakParams } from "./KeycloakTokenProviderParams";

const EXPIRATION_MARGIN_MS = RedstoneCommon.secsToMs(30);

const HEADERS = { "Content-Type": "application/x-www-form-urlencoded" };
const GRANT_TYPE_REFRESH_TOKEN = "refresh_token" as const;
const GRANT_TYPE_PASSWORD = "password" as const;

const RETRY_CONFIG = { maxRetries: 3, waitBetweenMs: 100 };

type GetTokenRequest = {
  client_id: string;
} & (
  | {
      grant_type: typeof GRANT_TYPE_PASSWORD;
      username: string;
      password: string;
    }
  | {
      grant_type: typeof GRANT_TYPE_REFRESH_TOKEN;
      refresh_token: string;
    }
);

type GetTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
};

export class KeycloakTokenProvider {
  private static logger = loggerFactory("keycloak-token-provider");

  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly username: string;
  private readonly password: string;

  private accessToken?: string;
  private refreshToken?: string;
  private expiresAt = 0;
  private refreshExpiresAt = 0;
  private used = false;
  private timer?: NodeJS.Timeout;
  private refreshingPromise?: Promise<string>;

  constructor(opts?: KeycloakTokenProviderParams | string) {
    const { url, realm, clientId, username, password } = makeKeycloakParams(opts);

    this.tokenUrl = `${url}/auth/realms/${realm}/protocol/openid-connect/token`;
    this.clientId = clientId;
    this.username = username;
    this.password = password;
  }

  async getToken() {
    this.used = true;

    if (this.accessToken && Date.now() < this.expiresAt - EXPIRATION_MARGIN_MS) {
      KeycloakTokenProvider.logToken("cache-hit", this.accessToken);
      return this.accessToken;
    }

    return await this.refresh();
  }

  dispose() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private async refresh() {
    const pending = this.refreshingPromise;
    if (pending) {
      return await pending;
    }

    const promise = this.doRefresh();
    this.refreshingPromise = promise;

    try {
      return await promise;
    } catch (e) {
      KeycloakTokenProvider.logger.error(
        `Failed to get token! ${RedstoneCommon.stringifyError(e)}`
      );
      throw e;
    } finally {
      if (this.refreshingPromise === promise) {
        this.refreshingPromise = undefined;
      }
    }
  }

  private async doRefresh() {
    if (this.refreshToken && Date.now() < this.refreshExpiresAt - EXPIRATION_MARGIN_MS) {
      try {
        return await this.requestToken({
          grant_type: GRANT_TYPE_REFRESH_TOKEN,
          client_id: this.clientId,
          refresh_token: this.refreshToken,
        });
      } catch {
        this.refreshToken = undefined;
      }
    }

    return await this.requestToken({
      grant_type: GRANT_TYPE_PASSWORD,
      client_id: this.clientId,
      username: this.username,
      password: this.password,
    });
  }

  private scheduleRefresh(expiresIn: number) {
    clearTimeout(this.timer);

    const delay = Math.max(RedstoneCommon.secsToMs(expiresIn) - 2 * EXPIRATION_MARGIN_MS, 0);
    if (!delay) {
      return;
    }

    this.timer = setTimeout(() => {
      if (!this.used) {
        KeycloakTokenProvider.logger.debug("Token unused, skipping auto-refresh");
        return;
      }
      this.used = false;

      this.refresh()
        .then((t) => KeycloakTokenProvider.logToken("auto-refresh", t))
        .catch((e) =>
          KeycloakTokenProvider.logger.error(
            `Token auto-refresh failed ${RedstoneCommon.stringifyError(e)}`
          )
        );
    }, delay);

    this.timer.unref();
  }

  private async requestToken(body: GetTokenRequest) {
    KeycloakTokenProvider.logger.info(`Requesting token with ${body.client_id}/${body.grant_type}`);

    const { data } = await RedstoneCommon.axiosPostWithRetries<GetTokenResponse>(
      this.tokenUrl,
      body,
      {
        ...RETRY_CONFIG,
        headers: HEADERS,
        fnName: "request-token",
      }
    );

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token ?? this.refreshToken;
    this.expiresAt = Date.now() + RedstoneCommon.secsToMs(data.expires_in);
    this.refreshExpiresAt =
      Date.now() + RedstoneCommon.secsToMs(data.refresh_expires_in ?? data.expires_in);
    this.scheduleRefresh(Math.min(data.expires_in, data.refresh_expires_in ?? data.expires_in));
    KeycloakTokenProvider.logToken(body.grant_type, this.accessToken);

    return this.accessToken;
  }

  private static logToken(context: string, token: string) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as {
        jti: string;
        exp: string;
        iat: string;
      };
      KeycloakTokenProvider.logger.debug(
        `[${context}] jti=${payload.jti} exp=${payload.exp} iat=${payload.iat}`
      );
    } catch {
      KeycloakTokenProvider.logger.debug(`[${context}] token=...${token.slice(-12)}`);
    }
  }
}
