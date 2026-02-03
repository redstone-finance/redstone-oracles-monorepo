import { ContractAdapter, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import {
  ContractData,
  ContractParamsProvider,
  LastRoundDetails,
  UpdatePricesOptions,
} from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Account, Contract, Keypair } from "@stellar/stellar-sdk";
import _ from "lodash";
import * as XdrUtils from "../XdrUtils";
import { splitParamsIntoBatches } from "../split-params-into-batches";
import { StellarClient } from "../stellar/StellarClient";
import { StellarContractUpdater } from "../stellar/StellarContractUpdater";
import { StellarOperationSender } from "../stellar/StellarOperationSender";

export const RANDOM_ACCOUNT_FOR_SIMULATION = new Account(Keypair.random().publicKey(), "1");

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

export class StellarContractAdapter implements ContractAdapter {
  protected readonly contract: Contract;

  constructor(
    protected readonly client: StellarClient,
    contract: string
  ) {
    this.contract = new Contract(contract);
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, _blockNumber?: number) {
    const feedIds = paramsProvider.getDataFeedIds();

    return (await this.getContractData(feedIds)).map((data) => data[1]?.lastValue ?? 0n);
  }

  async readTimestampFromContract(feedId: string, _blockNumber?: number) {
    return (await this.readContractData([feedId]))[feedId].lastDataPackageTimestampMS;
  }

  async readContractData(feedIds: string[], _blockNumber?: number) {
    const data = await this.getContractData(feedIds);

    return Object.fromEntries(data) as ContractData;
  }

  async getUniqueSignerThreshold(_blockNumber?: number) {
    const operation = this.contract.call("unique_signer_threshold");

    return await this.client.simulateOperation(operation, RANDOM_ACCOUNT_FOR_SIMULATION, (sim) =>
      XdrUtils.parsePrimitiveFromSimulation(sim, Number)
    );
  }

  async readLatestUpdateBlockTimestamp(feedId: string, _blockNumber?: number) {
    return (await this.getContractData([feedId]))[0][1]!.lastBlockTimestampMS;
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const paramsProviders = splitParamsIntoBatches(paramsProvider);

    const promises = paramsProviders.map(async (paramsProvider) => {
      const operation = this.contract.call(
        "get_prices",
        ...(await prepareCallArgs(paramsProvider))
      );

      const sim = await this.client.simulateOperation(
        operation,
        RANDOM_ACCOUNT_FOR_SIMULATION,
        XdrUtils.parseGetPricesSimulation
      );

      return sim.prices;
    });

    const prices = await Promise.all(promises);

    return prices.flat();
  }

  private async getContractData(
    feedIds: string[]
  ): Promise<[string, LastRoundDetails | undefined][]> {
    const data = await this.client.getContractEntries(
      this.contract,
      feedIds.map(XdrUtils.stringToScVal)
    );

    return _.zip(feedIds, data) as [string, LastRoundDetails | undefined][];
  }
}

export class StellarWriteContractAdapter
  extends StellarContractAdapter
  implements WriteContractAdapter
{
  private readonly logger = loggerFactory("stellar-write-price-adapter");

  constructor(
    client: StellarClient,
    contract: string,
    protected readonly operationSender: StellarOperationSender
  ) {
    super(client, contract);
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

    return FP.unwrapSuccess(result).transactionHash;
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
