import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { type DataPackagesResponse, getResponseTimestamp } from "./request-data-packages-common";

const PACKAGE_STALENESS_WARN_THRESHOLD = RedstoneCommon.secsToMs(15);
export class RequestDataPackagesLogger {
  private readonly initialDate: number;
  private readonly particularResponses: (DataPackagesResponse | undefined)[];
  private readonly particularErrors: unknown[];
  private readonly particularTimes: (number | undefined)[];

  constructor(
    requestsLength: number,
    private readonly historicalTimestamp?: number,
    protected readonly logger = loggerFactory("request-data-packages")
  ) {
    this.initialDate = Date.now();

    this.particularResponses = Array.from({ length: requestsLength });
    this.particularErrors = Array.from({ length: requestsLength });
    this.particularTimes = Array.from({ length: requestsLength });
  }

  private static filterOutUndefined<T>(array: (T | undefined)[]) {
    return array.filter((item) => item !== undefined);
  }

  didReceiveError(error: unknown, index: number) {
    this.particularErrors[index] = error;
    this.particularTimes[index] = Date.now() - this.initialDate;
  }

  didReceiveResponse(response: DataPackagesResponse, index: number) {
    const packageTimestamp = getResponseTimestamp(response);
    const baseTimestamp = this.historicalTimestamp ?? Date.now();
    const timestampDelta = baseTimestamp - packageTimestamp;
    if (timestampDelta > PACKAGE_STALENESS_WARN_THRESHOLD) {
      this.logger.warn(
        `Received stale package: timestampDelta=${timestampDelta} ms ` +
          `vs ${this.historicalTimestamp ? "historicalTimestamp" : "Date.now()"}=${baseTimestamp} for response index ${index}`
      );
    }

    this.particularResponses[index] = response;
    this.particularTimes[index] = Date.now() - this.initialDate;
  }

  willCheckState(timeout: boolean, didResolveOrReject: boolean) {
    const collectedResponses = RequestDataPackagesLogger.filterOutUndefined(
      this.particularResponses
    );
    const particularTimestamps = this.particularTimestamps();
    const collectedErrors = RequestDataPackagesLogger.filterOutUndefined(this.particularErrors);

    this.logger[timeout ? "info" : "debug"](
      `${timeout ? "Timed out with" : "Checking"} ${RedstoneCommon.getNS(collectedResponses.length, "response")} / ${RedstoneCommon.getNS(collectedErrors.length, "error")},` +
        ` didResolveOrReject before: ${didResolveOrReject}`,
      {
        particularTimestamps,
        particularTimes: this.particularTimes,
        particularErrors: this.particularErrors.map((e) => RedstoneCommon.stringifyError(e)),
        collectedResponsesLength: collectedResponses.length,
        collectedErrorsLength: collectedErrors.length,
      }
    );
  }

  willResolve(dataPackagesResponse: DataPackagesResponse, dataServiceId: string) {
    const responseTimestamp = getResponseTimestamp(dataPackagesResponse);
    const timestampDelta = Date.now() - responseTimestamp;
    const collectedResponses = RequestDataPackagesLogger.filterOutUndefined(
      this.particularResponses
    );
    const particularTimestamps = this.particularTimestamps();

    this.logger.log(
      `Resolving with the ${this.historicalTimestamp ? "historical" : "newest"} package for ${dataServiceId}, ` +
        `timestamp: ${responseTimestamp} of ${RedstoneCommon.getNS(collectedResponses.length, "response")}` +
        `, ${RedstoneCommon.msToSecs(timestampDelta)} [s] ago`,
      {
        responseTimestamps: particularTimestamps,
        timestampDelta,
        collectedResponsesLength: collectedResponses.length,
        particularTimes: this.particularTimes,
      }
    );
  }

  willReject() {
    this.logger.error("Rejecting...", {
      particularErrors: this.particularErrors.map((e) => RedstoneCommon.stringifyError(e)),
    });
  }

  feedIsMissing(message: string) {
    this.logger.info(message);
  }

  private particularTimestamps() {
    return this.particularResponses.map((response) =>
      response ? getResponseTimestamp(response) : undefined
    );
  }
}
