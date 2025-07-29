import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { Contract, Keypair, rpc } from "@stellar/stellar-sdk";
import _ from "lodash";
import { StellarRpcClient } from "./StellarRpcClient";
import * as XdrUtils from "./XdrUtils";

export class StellarContractAdapter implements IMultiFeedPricesContractAdapter {
  private readonly logger = loggerFactory("stellar-price-adapter");

  private readonly contract: Contract;
  private readonly rpcClient: StellarRpcClient;

  constructor(
    rpc: rpc.Server,
    private readonly keypair: Keypair,
    contractAddress: string
  ) {
    this.contract = new Contract(contractAddress);
    this.rpcClient = new StellarRpcClient(rpc);
  }

  async init(admin: string) {
    const adminAddr = XdrUtils.addressToScVal(admin);
    const operation = this.contract.call("init", adminAddr);

    const submitResponse = await this.rpcClient.executeOperation(
      operation,
      this.keypair
    );

    await this.rpcClient.waitForTx(submitResponse.hash);
  }

  async changeAdmin(newAdmin: string) {
    const adminAddr = XdrUtils.addressToScVal(newAdmin);
    const operation = this.contract.call("change_admin", adminAddr);

    const submitResponse = await this.rpcClient.executeOperation(
      operation,
      this.keypair
    );

    await this.rpcClient.waitForTx(submitResponse.hash);
  }

  async readContractData(feedIds: string[], _blockNumber?: number) {
    const data = _.zip(feedIds, await this.getContractData(feedIds));

    return Object.fromEntries(data) as ContractData;
  }

  async getUniqueSignerThreshold(_blockNumber?: number) {
    const operation = this.contract.call("unique_signer_threshold");

    const sim = await this.rpcClient.simulateOperation(
      operation,
      this.keypair.publicKey()
    );

    return XdrUtils.parsePrimitiveFromSimulation(sim, Number);
  }

  async readLatestUpdateBlockTimestamp(feedId: string, _blockNumber?: number) {
    return (await this.getContractData([feedId]))[0].lastBlockTimestampMS;
  }

  async getSignerAddress() {
    return await Promise.resolve(this.keypair.publicKey());
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const operation = this.contract.call(
      "get_prices",
      ...(await this.prepareCallArgs(paramsProvider))
    );

    const sim = await this.rpcClient.simulateOperation(
      operation,
      this.keypair.publicKey()
    );

    return XdrUtils.parseGetPricesSimulation(sim).prices;
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ) {
    const updater = XdrUtils.addressToScVal(this.keypair.publicKey());

    const operation = this.contract.call(
      "write_prices",
      updater,
      ...(await this.prepareCallArgs(paramsProvider))
    );

    const submitResponse = await this.rpcClient.executeOperation(
      operation,
      this.keypair
    );

    return submitResponse.hash;
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    _blockNumber?: number
  ) {
    const feedIds = paramsProvider.getDataFeedIds();

    return (await this.getContractData(feedIds)).map((data) => data.lastValue);
  }

  async readTimestampFromContract(feedId: string, _blockNumber?: number) {
    return (await this.getContractData([feedId]))[0].lastDataPackageTimestampMS;
  }

  async getContractData(feedIds: string[]) {
    const feedIdsScVal = XdrUtils.mapArrayToScVec(
      feedIds,
      XdrUtils.stringToScVal
    );
    const operation = this.contract.call("read_price_data", feedIdsScVal);

    const sim = await this.rpcClient.simulateOperation(
      operation,
      this.keypair.publicKey()
    );

    return XdrUtils.parseReadPriceDataSimulation(sim);
  }

  async prepareCallArgs(paramsProvider: ContractParamsProvider) {
    const feedIdsScVal = XdrUtils.mapArrayToScVec(
      paramsProvider.getDataFeedIds(),
      XdrUtils.stringToScVal
    );

    const payloadScVal = XdrUtils.numbersToScvBytes(
      await paramsProvider.getPayloadData()
    );

    return [feedIdsScVal, payloadScVal];
  }
}
