import axios, { AxiosResponse, RawAxiosRequestHeaders, type AxiosInstance } from "axios";
import { retry, RetryConfig } from "./retry";

export type AxiosWithRetriesConfig = {
  timeout?: number;
  headers?: RawAxiosRequestHeaders;
  params?: unknown;
} & Omit<RetryConfig, "fn">;

const AXIOS_FN_BY_METHOD = {
  GET: "axios.get",
  POST: "axios.post",
  PUT: "axios.put",
};

const METHODS_WITHOUT_BODY = ["GET"];

export type AxiosMethod = keyof typeof AXIOS_FN_BY_METHOD;

async function axiosRequestWithRetries<T>(
  method: AxiosMethod,
  url: string,
  config: AxiosWithRetriesConfig,
  axiosInstance: AxiosInstance,
  data?: unknown
): Promise<AxiosResponse<T>> {
  const hasBody = !METHODS_WITHOUT_BODY.includes(method);

  return await retry({
    fnName: config.fnName ?? AXIOS_FN_BY_METHOD[method],
    fn: async () =>
      await axiosInstance.request<T>({
        url,
        method,
        timeout: config.timeout,
        headers: config.headers,
        params: config.params,
        ...(hasBody ? { data } : {}),
      }),
    ...config,
  })();
}

export async function axiosGetWithRetries<T>(
  url: string,
  config: AxiosWithRetriesConfig,
  axiosInstance: AxiosInstance = axios
): Promise<AxiosResponse<T>> {
  return await axiosRequestWithRetries<T>("GET", url, config, axiosInstance);
}

export async function axiosPostWithRetries<T>(
  url: string,
  data: unknown,
  config: AxiosWithRetriesConfig,
  axiosInstance: AxiosInstance = axios
): Promise<AxiosResponse<T>> {
  return await axiosRequestWithRetries<T>("POST", url, config, axiosInstance, data);
}

export async function axiosPutWithRetries<T>(
  url: string,
  data: unknown,
  config: AxiosWithRetriesConfig,
  axiosInstance: AxiosInstance = axios
): Promise<AxiosResponse<T>> {
  return await axiosRequestWithRetries<T>("PUT", url, config, axiosInstance, data);
}
