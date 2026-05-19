import _ from "lodash";
import { z } from "zod";

const TYPE_KEY = "type";

export interface ApiSetup<T extends string = string> {
  baseUrl: string;
  host: string;
  type: T;
  params: URLSearchParams;
  urlString: string;
}

export function ensureUrlScheme(urlOrHost: string, scheme = "https") {
  return urlOrHost.includes("://") ? urlOrHost : `${scheme}://${urlOrHost}`;
}

export const urlOrHostSchema = z
  .string()
  .refine((s) => z.url().safeParse(ensureUrlScheme(s)).success, {
    message: "Invalid URL or host",
  });

export function parseUrl<T extends string>(
  urlString: string,
  defaultType: T,
  validTypes?: readonly T[]
) {
  const validated = urlOrHostSchema.parse(urlString);
  const url = new URL(ensureUrlScheme(validated));
  const params = new URLSearchParams(url.hash.slice(1));
  const rawType = params.get(TYPE_KEY);
  if (rawType && validTypes && !(validTypes as readonly string[]).includes(rawType)) {
    throw new Error(
      `Unknown URL type "${rawType}" in "${urlString}"; expected one of: ${validTypes.join(", ")}`
    );
  }
  const type = (rawType ?? defaultType) as T;
  const baseUrl = url.origin + url.pathname;

  return { baseUrl, host: url.host, type, params, urlString };
}

export function splitUrls<T extends string, S extends ApiSetup<T>>(
  urls: string[],
  parser: (urlString: string) => S
) {
  return _.groupBy(
    urls.map((url) => parser(url)),
    TYPE_KEY
  ) as Partial<Record<T, S[]>>;
}
