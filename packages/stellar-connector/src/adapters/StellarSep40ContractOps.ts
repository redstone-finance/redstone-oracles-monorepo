import { RedstoneCommon } from "@redstone-finance/utils";
import { BASE_FEE, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { StellarInvocation } from "../client/IStellarCaller";
import { FeedMapping, feedMappingToScVal } from "../sep-40-types";
import { StellarContractOps } from "./StellarContractOps";

const TIMEOUT_SEC = RedstoneCommon.hourToSecs(12);

const FN_ADD_FEED = "add_feed";
const FN_REMOVE_FEED = "remove_feed";
const FN_UPDATE_FEED = "update_feed";
const FN_SET_RESOLUTION = "set_resolution";
const FN_EXTEND_ENTRIES_TTL = "extend_entries_ttl";

export class StellarSep40ContractOps extends StellarContractOps {
  async addFeedTx(sender: string, feedMapping: FeedMapping, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    return await this.client.prepareTransaction(
      this.contract.call(FN_ADD_FEED, feedMappingToScVal(feedMapping)),
      sender,
      fee,
      timeout
    );
  }

  async removeFeedTx(sender: string, feed: string, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    return await this.client.prepareTransaction(
      this.contract.call(FN_REMOVE_FEED, nativeToScVal(feed, { type: "string" })),
      sender,
      fee,
      timeout
    );
  }

  async updateFeedTx(
    sender: string,
    feedMapping: FeedMapping,
    fee = BASE_FEE,
    timeout = TIMEOUT_SEC
  ) {
    return await this.client.prepareTransaction(
      this.contract.call(FN_UPDATE_FEED, feedMappingToScVal(feedMapping)),
      sender,
      fee,
      timeout
    );
  }

  async addFeedsTx(
    sender: string,
    feedMappings: FeedMapping[],
    fee = BASE_FEE,
    timeout = TIMEOUT_SEC
  ) {
    return await this.multicallTx(
      sender,
      feedMappings.map((m) => this.invocation(FN_ADD_FEED, feedMappingToScVal(m))),
      fee,
      timeout
    );
  }

  async removeFeedsTx(sender: string, feeds: string[], fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    return await this.multicallTx(
      sender,
      feeds.map((feed) => this.invocation(FN_REMOVE_FEED, nativeToScVal(feed, { type: "string" }))),
      fee,
      timeout
    );
  }

  async replaceFeedIdTx(
    sender: string,
    oldFeedId: string,
    newFeedMapping: FeedMapping,
    fee = BASE_FEE,
    timeout = TIMEOUT_SEC
  ) {
    return await this.multicallTx(
      sender,
      [
        this.invocation(FN_REMOVE_FEED, nativeToScVal(oldFeedId, { type: "string" })),
        this.invocation(FN_ADD_FEED, feedMappingToScVal(newFeedMapping)),
      ],
      fee,
      timeout
    );
  }

  async updateFeedsTx(
    sender: string,
    feedMappings: FeedMapping[],
    fee = BASE_FEE,
    timeout = TIMEOUT_SEC
  ) {
    return await this.multicallTx(
      sender,
      feedMappings.map((m) => this.invocation(FN_UPDATE_FEED, feedMappingToScVal(m))),
      fee,
      timeout
    );
  }

  async setResolutionTx(sender: string, resolution: number, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    return await this.client.prepareTransaction(
      this.contract.call(FN_SET_RESOLUTION, nativeToScVal(resolution, { type: "u32" })),
      sender,
      fee,
      timeout
    );
  }

  async addFeed(feedMapping: FeedMapping) {
    return await this.operationSender?.sendTransaction(
      this.contract.call(FN_ADD_FEED, feedMappingToScVal(feedMapping))
    );
  }

  async removeFeed(feed: string) {
    return await this.operationSender?.sendTransaction(
      this.contract.call(FN_REMOVE_FEED, nativeToScVal(feed, { type: "string" }))
    );
  }

  async updateFeed(feedMapping: FeedMapping) {
    return await this.operationSender?.sendTransaction(
      this.contract.call(FN_UPDATE_FEED, feedMappingToScVal(feedMapping))
    );
  }

  async setResolution(resolution: number) {
    return await this.operationSender?.sendTransaction(
      this.contract.call(FN_SET_RESOLUTION, nativeToScVal(resolution, { type: "u32" }))
    );
  }

  async extendEntriesTtl() {
    return await this.operationSender?.sendTransaction(this.contract.call(FN_EXTEND_ENTRIES_TTL));
  }

  private invocation(method: string, ...args: xdr.ScVal[]) {
    return { contract: this.contract, method, args };
  }

  private async multicallTx(
    sender: string,
    invocations: StellarInvocation[],
    fee = BASE_FEE,
    timeout = TIMEOUT_SEC
  ) {
    return await this.client.prepareMulticallTransaction(invocations, sender, fee, timeout);
  }
}
