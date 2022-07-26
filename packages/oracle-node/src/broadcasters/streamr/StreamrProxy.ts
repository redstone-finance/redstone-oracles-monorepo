import { StreamrClient, StorageNode, StreamOperation } from "streamr-client";
import { Consola } from "consola";

const logger = require("../../utils/logger")("StreamrProxy") as Consola;

export class StreamrProxy {
  private streamrClient: StreamrClient;

  constructor(ethPrivateKey: string) {
    this.streamrClient = new StreamrClient({
      auth: { privateKey: ethPrivateKey },
    });
  }

  // Returns stream id of the created (or previously created) stream
  async tryCreateStream(name: string): Promise<string> {
    const streamId = await this.getStreamIdForStreamName(name);
    const streamExists = await this.doesStreamExist(streamId);
    if (streamExists) {
      logger.info(`Streamr stream already exists: ${streamId}`);
      return streamId;
    } else {
      return await this.createStream(streamId);
    }
  }

  public async publishToStreamByName(data: any, streamName: string) {
    const streamId = await this.getStreamIdForStreamName(streamName);
    return await this.publish(data, streamId);
  }

  // Publishes data to the stream
  private async publish(data: any, streamId: string) {
    await this.streamrClient.publish(streamId, {
      ...data,
    });
    logger.info(`New data published to the stream: ${streamId}`);
  }

  private async getStreamIdForStreamName(name: string): Promise<string> {
    const publicAddress = await this.streamrClient.getUserId();
    const path = `/redstone-oracle/${name}`;
    return `${publicAddress}${path}`;
  }

  // This method creates and configures a stream.
  // It enables historical data storage in STREAMR_GERMANY
  // And allows everyone to get the stream and access the stream data
  private async createStream(id: string): Promise<string> {
    const stream = await this.streamrClient.createStream({
      id,
      storageDays: 7,
      requireEncryptedData: false,
      requireSignedData: false,
      inactivityThresholdHours: 24 * 20, // 20 days
    });

    logger.info(`Stream created: ${stream.id}`);
    await stream.addToStorageNode(StorageNode.STREAMR_GERMANY);
    logger.info("Stream added to the storage node: STREAMR_GERMANY");
    await stream.grantPermission(
      StreamOperation.STREAM_SUBSCRIBE,
      undefined /* anyone */
    );
    await stream.grantPermission(
      StreamOperation.STREAM_GET,
      undefined /* anyone */
    );
    logger.info(`Added permissions to the stream: ${stream.id}`);

    return stream.id;
  }

  private async doesStreamExist(streamId: string): Promise<boolean> {
    try {
      await this.streamrClient.getStream(streamId);
      return true;
    } catch (e: any) {
      if (e.toString().includes("NOT_FOUND")) {
        return false;
      } else {
        throw e;
      }
    }
  }
}
