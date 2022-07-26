import axios from "axios";
import jp from "jsonpath";
import { FetcherOpts, PricesObj } from "../../types";
import { BaseFetcher } from "../BaseFetcher";
import { stringifyError } from "../../utils/error-stringifier";

const CUSTOM_URL_REQUEST_TIMEOUT_MILLISECONDS = 10000;

export class CustomUrlsFetcher extends BaseFetcher {
  constructor() {
    super(`custom-urls`);
  }

  async fetchData(ids: string[], opts: FetcherOpts) {
    const responses: any = {};
    const promises = [];

    for (const id of ids) {
      // TODO: maybe implement hash verification later

      const url = opts.manifest.tokens[id].customUrlDetails!.url;

      const promise = axios
        .get(url, {
          timeout: CUSTOM_URL_REQUEST_TIMEOUT_MILLISECONDS,
        })
        .then((response) => {
          responses[id] = response.data;
        })
        .catch((err) => {
          const errMsg = stringifyError(err);
          this.logger.error(
            `Request to url failed. Url: ${url} Error: ${errMsg}`
          );
        });
      promises.push(promise);
    }

    await Promise.allSettled(promises);

    return responses;
  }

  async extractPrices(
    responses: any,
    _ids: string[],
    opts: FetcherOpts
  ): Promise<PricesObj> {
    const pricesObj: PricesObj = {};
    for (const [id, response] of Object.entries(responses)) {
      const jsonpath = opts.manifest.tokens[id].customUrlDetails!.jsonpath;
      const extractedValue = jp.query(response, jsonpath);
      pricesObj[id] = extractedValue[0];
    }
    return pricesObj;
  }
}
