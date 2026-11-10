import { AxiosRequestConfig, AxiosResponse } from "axios";

export type AxiosGetRequest<T> = {
  urls: string[];
  axiosConfig?: AxiosRequestConfig;
  /** the caller chooses the client, so a capped one is never silently swapped for raw axios */
  makeGetRequest: (url: string, axiosConfig?: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
};

export const fetchWithFallbacks = <T>(args: AxiosGetRequest<T>): Promise<AxiosResponse<T>> => {
  const requests = args.urls.map((url) => args.makeGetRequest(url, args.axiosConfig));

  return Promise.any(requests);
};
