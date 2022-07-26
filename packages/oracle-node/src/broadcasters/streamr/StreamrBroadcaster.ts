import _ from "lodash";
import { Broadcaster } from "../Broadcaster";
import { SignedDataPackagePlainObj } from "redstone-protocol";
import { Consola } from "consola";
import { StreamrProxy } from "./StreamrProxy";

const logger = require("../../utils/logger")("StreamrBroadcaster") as Consola;

const STREAMR_BROADCASTING_INTERVAL_MILLISECONDS = 3000;
const PACKAGE_STREAM_NAME = "package";
const PRICES_STREAM_NAME = "prices";

export class StreamrBroadcaster implements Broadcaster {
  private streamrProxy: StreamrProxy;
  private pricesToBroadcast: Partial<SignedDataPackagePlainObj>[] = [];
  private packageToBroadcast: SignedDataPackagePlainObj | undefined;
  private timer?: NodeJS.Timer;

  constructor(ethereumPrivateKey: string) {
    this.streamrProxy = new StreamrProxy(ethereumPrivateKey);
    this.streamrProxy.tryCreateStream(PACKAGE_STREAM_NAME);
    this.streamrProxy.tryCreateStream(PRICES_STREAM_NAME);
    this.lazyEnableTimer();
  }

  private lazyEnableTimer() {
    const haveDataToBroadcast =
      this.packageToBroadcast || this.pricesToBroadcast.length > 0;
    if (!this.timer && haveDataToBroadcast) {
      this.timer = setInterval(
        this.broadcastInternal.bind(this),
        STREAMR_BROADCASTING_INTERVAL_MILLISECONDS
      );
    }
  }

  private async broadcastInternal(): Promise<void> {
    const promises = [];

    if (this.pricesToBroadcast.length > 0) {
      const data = this.pricesToBroadcast;
      const streamName = PRICES_STREAM_NAME;
      logger.info("Broadcasting prices to streamr");
      promises.push(this.streamrProxy.publishToStreamByName(data, streamName));
    }

    if (this.packageToBroadcast) {
      const data = this.packageToBroadcast;
      const streamName = PACKAGE_STREAM_NAME;
      logger.info("Broadcasting package to streamr");
      promises.push(this.streamrProxy.publishToStreamByName(data, streamName));
    }

    await Promise.all(promises);
  }

  async broadcast(prices: SignedDataPackagePlainObj[]): Promise<void> {
    this.pricesToBroadcast = prices.map((p) => _.omit(p, ["source"]));
    this.lazyEnableTimer();
  }

  async broadcastPricePackage(
    signedData: SignedDataPackagePlainObj
  ): Promise<void> {
    this.packageToBroadcast = signedData;
    this.lazyEnableTimer();
  }
}
