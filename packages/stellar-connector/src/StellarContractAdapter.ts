import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import {
  Contract,
  Keypair,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import _ from "lodash";
import { lastRoundDetailsFromXdrMap, parseReturnValue } from "./ContractData";
import { StellarRpcClient } from "./StellarRpcClient";

export class StellarContractAdapter implements IMultiFeedPricesContractAdapter {
  private readonly logger = loggerFactory("stellar-price-adapter");

  private readonly contract: Contract;
  private readonly rpcClient: StellarRpcClient;

  constructor(
    private readonly rpc: rpc.Server,
    private readonly keypair: Keypair,
    contractAddress: string
  ) {
    this.contract = new Contract(contractAddress);
    this.rpcClient = new StellarRpcClient(rpc);
  }

  async init(admin: Keypair) {
    const admin_addr = xdr.ScVal.scvAddress(
      xdr.ScAddress.scAddressTypeAccount(admin.xdrAccountId())
    );
    const operation = this.contract.call("init", admin_addr);
    const submitResponse = await this.rpcClient.executeOperation(
      operation,
      this.keypair
    );
    await this.rpcClient.waitForTx(submitResponse.hash);
  }

  async changeAdmin(admin: Keypair) {
    const admin_addr = xdr.ScVal.scvAddress(
      xdr.ScAddress.scAddressTypeAccount(admin.xdrAccountId())
    );
    const operation = this.contract.call("change_admin", admin_addr);
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

    const tx = await this.rpcClient.transactionFromOperation(
      operation,
      this.keypair.publicKey()
    );
    const sim = await this.rpcClient.simulateTransaction(tx);

    return Number(scValToNative(sim.result!.retval));
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

    const submitResponse = await this.rpcClient.executeOperation(
      operation,
      this.keypair
    );
    const resp = await this.rpcClient.waitForTx(submitResponse.hash);

    return parseReturnValue(resp.returnValue!.vec()!).prices;
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ) {
    const updater = xdr.ScVal.scvAddress(
      xdr.ScAddress.scAddressTypeAccount(this.keypair.xdrAccountId())
    );

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
    const feedIdsScVal = xdr.ScVal.scvVec(
      feedIds.map((id) => xdr.ScVal.scvString(id))
    );
    const operation = this.contract.call("read_price_data", feedIdsScVal);
    const tx = await this.rpcClient.transactionFromOperation(
      operation,
      this.keypair.publicKey()
    );
    const sim = await this.rpcClient.simulateTransaction(tx);

    const vec = sim.result!.retval.vec()!;

    return vec.map((data) => lastRoundDetailsFromXdrMap(data.map()!));
  }

  async prepareCallArgs(paramsProvider: ContractParamsProvider) {
    const feedIdsScVal = xdr.ScVal.scvVec(
      paramsProvider.getDataFeedIds().map((id) => xdr.ScVal.scvString(id))
    );

    const payloadScVal = xdr.ScVal.scvBytes(
      Buffer.from(await paramsProvider.getPayloadData())
    );
    return [feedIdsScVal, payloadScVal];
  }
}
