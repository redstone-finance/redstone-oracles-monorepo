import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { chainIdToNetwork, networkToChainId } from "../CantonNetwork";
import {
  API_TYPE_JSON,
  API_TYPE_SCAN,
  API_TYPE_SCAN_PROXY,
  API_TYPE_VALIDATOR,
  CantonApi,
  TokenProvider,
} from "./CantonApi";
import { CantonClient, JsonCantonApi } from "./CantonClient";
import { ScanCantonApi } from "./CantonScanApiClient";
import { CantonValidatorClient, ValidatorCantonApi } from "./CantonValidatorClient";
import { KeycloakTokenProvider } from "./keycloak-token-provider";
import { KeycloakTokenProviderParams, makeKeycloakParams } from "./KeycloakTokenProviderParams";

const SINGLE_EXECUTION_TIMEOUT_MS = 20_000;
const ALL_EXECUTIONS_TIMEOUT_MS = 45_000;

export class CantonClientBuilder extends MultiExecutor.ClientBuilder<CantonClient> {
  protected override chainType = ChainTypeEnum.enum.canton;
  private tokenProviders: Record<string, TokenProvider | undefined> = {};
  private defaultClientId?: string;

  withDefaultAuth(opts?: KeycloakTokenProviderParams | string) {
    return this.chainId !== networkToChainId("localnet") ? this.withKeycloakAuth(opts) : this;
  }

  withKeycloakAuth(opts?: KeycloakTokenProviderParams | string) {
    const parsedOpts = makeKeycloakParams(opts);

    const tokenProvider = KeycloakTokenProvider.getInstance(parsedOpts);
    this.tokenProviders[parsedOpts.clientId] = tokenProvider.getToken.bind(tokenProvider);
    this.defaultClientId = parsedOpts.clientId;

    if (parsedOpts.walletClientId) {
      const walletParsedOpts = {
        ...parsedOpts,
        clientId: parsedOpts.walletClientId,
        username: parsedOpts.walletUsername ?? parsedOpts.username,
        password: parsedOpts.walletPassword ?? parsedOpts.password,
      };
      const walletTokenProvider = KeycloakTokenProvider.getInstance(walletParsedOpts);
      this.tokenProviders[walletParsedOpts.clientId] =
        walletTokenProvider.getToken.bind(walletTokenProvider);
    }

    return this;
  }

  private splitUrls(urls = this.urls) {
    return RedstoneCommon.splitUrls(urls, (urlString) => CantonApi.parseUrl(urlString));
  }

  protected override getEligibleUrls() {
    return this.splitUrls()[API_TYPE_JSON]?.map((api) => api.urlString) ?? [];
  }

  build() {
    const chainId = this.chainId;

    if (!chainId) {
      throw new Error("chainId is required");
    }

    const apis = this.splitUrls();
    const jsonApis = apis[API_TYPE_JSON];

    if (!jsonApis?.length) {
      throw new Error(`At least one ${API_TYPE_JSON} URL is required`);
    }

    const scanApi = apis[API_TYPE_SCAN]?.at(0);
    const scanApiProxy = apis[API_TYPE_SCAN_PROXY]?.at(0);

    const scanApiClient =
      scanApi && scanApiProxy?.clientId
        ? new ScanCantonApi(
            scanApiProxy.baseUrl,
            scanApi.baseUrl,
            this.tokenProviders[scanApiProxy.clientId]
          )
        : undefined;

    return this.makeMultiExecutor(
      (url) => {
        const jsonApi = CantonApi.parseUrl(url); // is eligible
        const clientId = jsonApi.clientId ?? this.defaultClientId;
        if (!clientId) {
          throw new Error(`Client id is required for ${RedstoneCommon.stringify(jsonApi)}`);
        }

        return new CantonClient(
          new JsonCantonApi(jsonApi.baseUrl, this.tokenProviders[clientId]),
          chainIdToNetwork(chainId),
          scanApiClient
        );
      },
      {
        exerciseChoices: MultiExecutor.ExecutionMode.FALLBACK,
        // the following use scan-api:
        getRemainingTraffic: MultiExecutor.ExecutionMode.FALLBACK,
        getTotalConsumedTraffic: MultiExecutor.ExecutionMode.FALLBACK,
        getAmuletBalance: MultiExecutor.ExecutionMode.FALLBACK,
      },
      {
        singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
        defaultMode: MultiExecutor.ExecutionMode.RACE,
      }
    );
  }

  buildValidatorClient() {
    const apis = this.splitUrls()[API_TYPE_VALIDATOR];
    const validatorApi = apis?.at(0);

    if (!validatorApi?.clientId) {
      return undefined;
    }

    return new CantonValidatorClient(
      new ValidatorCantonApi(validatorApi.baseUrl, this.tokenProviders[validatorApi.clientId])
    );
  }
}
