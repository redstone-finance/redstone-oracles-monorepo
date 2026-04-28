import { BASE_FEE, nativeToScVal } from "@stellar/stellar-sdk";
import { FeedMapping, feedMappingToScVal } from "../sep-40-types";
import { StellarContractOps } from "./StellarContractOps";

const TIMEOUT_SEC = 3600;

const FN_ADD_FEED = "add_feed";
const FN_REMOVE_FEED = "remove_feed";
const FN_UPDATE_FEED = "update_feed";
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

  async extendEntriesTtlTx(sender: string, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    return await this.client.prepareTransaction(
      this.contract.call(FN_EXTEND_ENTRIES_TTL),
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

  async extendEntriesTtl() {
    return await this.operationSender?.sendTransaction(this.contract.call(FN_EXTEND_ENTRIES_TTL));
  }
}
