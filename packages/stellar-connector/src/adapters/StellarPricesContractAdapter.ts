import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import _ from "lodash";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import * as XdrUtils from "../XdrUtils";

// TODO: remove it after switching to getContractData instead of simulating
const MOCK_TESTNET_ACCOUNT_ID =
  "GAZBYVTHAPTE423VKHTN3T7L2UHHSVRQQPPVXMUQRWDF576ATL47MJI2";

export class StellarPricesContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly contract: Contract,
    private readonly keypair?: Keypair
  ) {}

  async init(admin: string) {
    if (!this.keypair) {
      throw new Error("Keypair is missing");
    }

    const adminAddr = XdrUtils.addressToScVal(admin);
    const operation = this.contract.call("init", adminAddr);

    const submitResponse = await this.rpcClient.executeOperation(
      operation,
      this.keypair
    );

    await this.rpcClient.waitForTx(submitResponse.hash);
  }

  async changeAdmin(newAdmin: string) {
    if (!this.keypair) {
      throw new Error("Keypair is missing");
    }

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
      this.getPublicKey()
    );

    return XdrUtils.parsePrimitiveFromSimulation(sim, Number);
  }

  async readLatestUpdateBlockTimestamp(feedId: string, _blockNumber?: number) {
    return (await this.getContractData([feedId]))[0].lastBlockTimestampMS;
  }

  getSignerAddress() {
    return Promise.resolve(this.getPublicKey());
  }

  private getPublicKey() {
    return this.keypair?.publicKey() ?? MOCK_TESTNET_ACCOUNT_ID;
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const operation = this.contract.call(
      "get_prices",
      ...(await this.prepareCallArgs(paramsProvider))
    );

    const sim = await this.rpcClient.simulateOperation(
      operation,
      this.getPublicKey()
    );

    return XdrUtils.parseGetPricesSimulation(sim).prices;
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ) {
    if (!this.keypair) {
      throw new Error("Keypair is missing");
    }

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
    const results = await Promise.all(
      feedIds.map((feedId) => {
        const key = XdrUtils.stringToScVal(feedId);
        return this.rpcClient.getContractData(this.contract, key);
      })
    );
    return results.map(XdrUtils.parsePriceDataFromContractData);
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
