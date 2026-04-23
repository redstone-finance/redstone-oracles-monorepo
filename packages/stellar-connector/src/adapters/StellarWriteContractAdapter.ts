import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import _ from "lodash";
import * as XdrUtils from "../XdrUtils";
import { splitParamsIntoBatches } from "../split-params-into-batches";
import { StellarClient } from "../stellar/StellarClient";
import { StellarContractUpdater } from "../stellar/StellarContractUpdater";
import { StellarOperationSender } from "../stellar/StellarOperationSender";
import { StellarSigner } from "../stellar/StellarSigner";
import { StellarTxDeliveryManConfig } from "../stellar/StellarTxDeliveryManConfig";
import { StellarContractAdapter } from "./StellarContractAdapter";

const GET_PRICES_METHOD = "get_prices";
const UNIQUE_SIGNER_COUNT_METHOD = "unique_signer_threshold";

export class StellarWriteContractAdapter
  extends StellarContractAdapter
  implements WriteContractAdapter
{
  private readonly logger = loggerFactory("stellar-write-price-adapter");
  private readonly operationSender: StellarOperationSender;

  constructor(
    client: StellarClient,
    contractAddress: string,
    keypair: Keypair,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    super(client, contractAddress);

    this.operationSender = new StellarOperationSender(new StellarSigner(keypair), client, config);
  }

  async getUniqueSignerThreshold(blockNumber?: number) {
    return await this.client.call(
      {
        method: UNIQUE_SIGNER_COUNT_METHOD,
        contract: this.contract,
      },
      blockNumber,
      Number
    );
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const paramsProviders = splitParamsIntoBatches(paramsProvider);

    const promises = paramsProviders.map(async (paramsProvider) => {
      const args = await prepareCallArgs(paramsProvider);

      const sim = await this.client.call(
        {
          method: GET_PRICES_METHOD,
          contract: this.contract,
          args,
        },
        undefined,
        XdrUtils.parseGetPrices
      );

      return sim.prices;
    });

    const prices = await Promise.all(promises);

    return prices.flat();
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    const updater = new StellarContractUpdater(this.operationSender.getExecutor(), this.contract);
    const result = await this.operationSender.updateContract(updater, paramsProvider);

    if (options && Object.keys(options.feedAddresses).length > 0) {
      const feedAddresses = _.at(options.feedAddresses, paramsProvider.getDataFeedIds());
      void this.maybeExtendTtlForPriceFeeds(feedAddresses);
    }

    const hash = FP.unwrapSuccess(result).transactionHash;

    await this.client.waitForTx(hash);

    return hash;
  }

  getSignerAddress(): Promise<string> {
    return this.operationSender.getPublicKey();
  }

  private async maybeExtendTtlForPriceFeeds(addresses: string[]) {
    const addressesToUpdate = await this.client.getAddressesToExtendInstanceTtl(addresses);

    if (!addressesToUpdate.length) {
      this.logger.info("No contracts to extend instance TTL");
    } else {
      this.logger.log(`Contracts to extend instance TTL: [${addressesToUpdate.join(`,`)}]`);
    }

    const signer = this.operationSender.signer;

    await RedstoneCommon.batchPromises(
      1,
      0,
      addressesToUpdate.map((address) => {
        return () => this.client.extendInstanceTtl(address, signer);
      })
    );
  }
}

async function prepareCallArgs(
  paramsProvider: ContractParamsProvider,
  metadataTimestamp = Date.now()
) {
  const feedIdsScVal = XdrUtils.mapArrayToScVec(
    paramsProvider.getDataFeedIds(),
    XdrUtils.stringToScVal
  );

  const payloadScVal = XdrUtils.numbersToScvBytes(
    await paramsProvider.getPayloadData({
      withUnsignedMetadata: true,
      metadataTimestamp,
      componentName: "stellar-connector",
    })
  );

  return [feedIdsScVal, payloadScVal];
}
