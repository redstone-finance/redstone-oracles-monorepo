import { DataPackagesRequestParams } from "../../src";

export const makeReqParamsFactory =
  (base: Record<string, unknown>) =>
  (overrides: Record<string, unknown> = {}): DataPackagesRequestParams =>
    ({
      ...base,
      ...overrides,
    }) as DataPackagesRequestParams;
