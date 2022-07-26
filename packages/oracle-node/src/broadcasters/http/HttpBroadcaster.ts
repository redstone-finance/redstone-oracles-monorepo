import axios from "axios";
import { Broadcaster } from "../Broadcaster";
import { SignedDataPackagePlainObj } from "redstone-protocol";
import { Consola } from "consola";
import { stringifyError } from "../../utils/error-stringifier";

const logger = require("../../utils/logger")("HttpBroadcaster") as Consola;

// TODO: add timeout to broadcasting

export class HttpBroadcaster implements Broadcaster {
  constructor(private readonly broadcasterURLs: string[]) {}

  async broadcast(prices: SignedDataPackagePlainObj[]): Promise<void> {
    const promises = this.broadcasterURLs.map((url) => {
      logger.info(`Posting prices to ${url}`);
      return axios
        .post(url + "/prices", prices)
        .then(() => logger.info(`Broadcasting to ${url} completed`))
        .catch((e) =>
          logger.error(`Broadcasting to ${url} failed: ${stringifyError(e)}`)
        );
    });

    await Promise.allSettled(promises);
  }

  async broadcastPricePackage(
    signedData: SignedDataPackagePlainObj
  ): Promise<void> {
    const promises = this.broadcasterURLs.map((url) => {
      logger.info(`Posting pacakages to ${url}`);
      return axios
        .post(url + "/packages", signedData)
        .then(() => logger.info(`Broadcasting package to ${url} completed`))
        .catch((e) =>
          logger.error(
            `Broadcasting package to ${url} failed: ${stringifyError(e)}`
          )
        );
    });

    await Promise.allSettled(promises);
  }
}
