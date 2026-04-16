import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import _ from "lodash";
import { StellarClient } from "../stellar/StellarClient";
import { StellarContractUpdater } from "../stellar/StellarContractUpdater";
import { StellarOperationSender } from "../stellar/StellarOperationSender";
import { StellarSigner } from "../stellar/StellarSigner";
import { StellarTxDeliveryManConfig } from "../stellar/StellarTxDeliveryManConfig";
import { StellarContractAdapter } from "./StellarContractAdapter";

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
