import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Operation,
  rpc,
  Transaction,
  TransactionBuilder,
  xdr,
  type Horizon,
} from "@stellar/stellar-sdk";
import _ from "lodash";
import { getLedgerCloseDate } from "../utils";
import * as XdrUtils from "../XdrUtils";
import { HorizonClient } from "./HorizonClient";
import { StellarSigner } from "./StellarSigner";

const REDSTONE_EVENT_TOPIC_QUALIFIER = "REDSTONE";
const TRANSACTION_TIMEOUT_SEC = 30;
const DAYS_TO_EXTEND_BEFORE = 7;
const LEDGERS_PER_DAY = RedstoneCommon.hourToSecs(24) / 5;

export class StellarClient {
  private readonly logger = loggerFactory("stellar-client");

  private getNetwork = RedstoneCommon.memoize({
    functionToMemoize: () => this.server.getNetwork(),
    ttl: RedstoneCommon.hourToMs(24),
    cacheKeyBuilder: () => this.server.serverURL.href(),
    cacheReporter: (isMissing) =>
      RedstoneCommon.reportMemoizeCacheUsage(
        isMissing,
        `network metadata of ${this.server.serverURL.href()}`
      ),
  });

  constructor(
    private readonly server: rpc.Server,
    private readonly horizon?: HorizonClient
  ) {}

  private async getAccount(publicKey: string): Promise<Account> {
    return await this.server.getAccount(publicKey);
  }

  async getAccountBalance(address: string) {
    const ledgerKey = XdrUtils.ledgerKeyFromAddress(address);

    const response = await this.server.getLedgerEntries(ledgerKey);

    return XdrUtils.accountFromResponse(response).balance().toBigInt();
  }

  async getBlockNumber() {
    return (await this.server.getLatestLedger()).sequence;
  }

  async getTransaction<T>(hash: string, valueTransform?: (returnValue: xdr.ScVal) => T) {
    const tx = await this.server.getTransaction(hash);

    if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        status: tx.status,
        cost: tx.resultXdr.feeCharged(),
        value: tx.returnValue ? valueTransform?.(tx.returnValue) : undefined,
      };
    }

    return {
      status: tx.status,
    };
  }

  async waitForTx(hash: string) {
    return await this.server.pollTransaction(hash);
  }

  async simulateTransaction(transaction: Transaction) {
    const sim = await this.server.simulateTransaction(transaction);

    if (!rpc.Api.isSimulationSuccess(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    return sim;
  }

  async prepareTransaction(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    signer: StellarSigner | string,
    fee = BASE_FEE,
    timeout = TRANSACTION_TIMEOUT_SEC
  ) {
    if (typeof signer !== "string") {
      signer = await signer.publicKey();
    }

    const tx = await this.buildTransaction(operation, signer, fee, timeout);

    return await this.server.prepareTransaction(tx);
  }

  async prepareSignedTransaction(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    signer: StellarSigner,
    fee = BASE_FEE,
    timeout = TRANSACTION_TIMEOUT_SEC
  ) {
    const transaction = await this.prepareTransaction(operation, signer, fee, timeout);

    await signer.sign(transaction);

    return transaction;
  }

  async buildTransaction(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string,
    fee = BASE_FEE,
    timeout = TRANSACTION_TIMEOUT_SEC
  ) {
    return new TransactionBuilder(await this.getAccount(sender), {
      fee,
      networkPassphrase: (await this.getNetwork()).passphrase,
    })
      .addOperation(operation)
      .setTimeout(timeout)
      .build();
  }

  async simulateOperation<T>(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string,
    transform: (sim: rpc.Api.SimulateTransactionSuccessResponse) => T
  ) {
    const tx = await this.buildTransaction(operation, sender);

    return transform(await this.simulateTransaction(tx));
  }

  async getContractData<T>(
    contract: string | Address | Contract,
    key: xdr.ScVal,
    transform: (result: rpc.Api.LedgerEntryResult) => T,
    durability?: rpc.Durability
  ) {
    return transform(await this.server.getContractData(contract, key, durability));
  }

  async sendTransaction(tx: Transaction) {
    return await this.server.sendTransaction(tx);
  }

  // Other

  async transferXlm(sender: StellarSigner, destination: string, amount: number) {
    const operation = Operation.payment({
      destination,
      asset: Asset.native(),
      amount: String(amount),
    });
    return await this.buildAndSendTransaction(sender, operation);
  }

  async createAccountWithFunds(sender: StellarSigner, destination: string, amount: number) {
    const operation = Operation.createAccount({
      destination,
      startingBalance: String(amount),
    });

    return await this.buildAndSendTransaction(sender, operation);
  }

  private async buildAndSendTransaction(
    sender: StellarSigner,
    operation: xdr.Operation<Operation.InvokeHostFunction>
  ) {
    const transaction = await this.buildTransaction(operation, await sender.publicKey());

    await sender.sign(transaction);
    const result = await this.sendTransaction(transaction);

    await this.waitForTx(result.hash);

    return result.hash;
  }

  // Indexer purposes

  async getTimeForBlock(sequence: number) {
    try {
      const response = await this.server.getLedgers({
        startLedger: sequence,
        pagination: {
          limit: 1,
        },
      });

      return getLedgerCloseDate(Number(response.ledgers[0].ledgerCloseTime));
    } catch {
      this.logger.warn(`Could not get time of ledger ${sequence}`);
      return new Date(0);
    }
  }

  async getTransactions(inputStartLedger: number, inputEndLedger: number) {
    const { startLedger, endLedger, inRange } = await this.fixLedgerVersions(
      inputStartLedger,
      inputEndLedger
    );

    if (!inRange) {
      return [];
    }

    const FETCHING_LIMIT = 200;
    let { transactions, cursor } = await this.server.getTransactions({
      startLedger,
      pagination: { limit: FETCHING_LIMIT },
    } as unknown as rpc.Api.GetTransactionsRequest);
    let lastLedger = transactions.at(-1)?.ledger;

    while (lastLedger !== undefined && lastLedger <= endLedger) {
      this.logger.log(`Fetching data of ${lastLedger} up to ${endLedger}`);

      const req = {
        pagination: { cursor, limit: FETCHING_LIMIT },
      };

      const result = await this.server.getTransactions(req);
      cursor = result.cursor;
      lastLedger = result.transactions.at(-1)?.ledger;
      transactions = transactions.concat(result.transactions);
    }

    return transactions.filter(({ ledger }) => ledger >= startLedger && ledger <= endLedger);
  }

  async getEventsWithTransactions(
    inputStartLedger: number,
    inputEndLedger: number,
    topic = REDSTONE_EVENT_TOPIC_QUALIFIER
  ) {
    const { startLedger, endLedger, inRange } = await this.fixLedgerVersions(
      inputStartLedger,
      inputEndLedger
    );

    if (!inRange) {
      return [];
    }

    const FETCHING_LIMIT = 10000;
    const allEvents = [];
    let currentCursor = undefined;
    let hasMoreEvents = false;

    do {
      this.logger.log(`Getting events with ${currentCursor ?? `limit: ${FETCHING_LIMIT}`}`);
      const filters: rpc.Api.EventFilter[] = [
        {
          type: "contract",
          topics: [[xdr.ScVal.scvSymbol(topic).toXDR("base64")]],
        },
      ];
      const { events, cursor } = await this.server.getEvents(
        currentCursor
          ? {
              cursor: currentCursor,
              limit: FETCHING_LIMIT,
              filters,
            }
          : {
              startLedger,
              endLedger,
              limit: FETCHING_LIMIT,
              filters,
            }
      );
      allEvents.push(...events);
      hasMoreEvents = events.length >= FETCHING_LIMIT;
      currentCursor = cursor;
    } while (hasMoreEvents && RedstoneCommon.isDefined(currentCursor));

    const txsPromises = allEvents.map(async ({ id, txHash }) => {
      const tx = await this.server.getTransaction(txHash);
      if (tx.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
        throw new Error(`Transaction ${txHash} not found for event ${id}`);
      }
      return tx;
    });
    const txs = await Promise.all(txsPromises);

    return _.zipWith(allEvents, txs, (event, tx) => ({ event, tx }));
  }

  private async fixLedgerVersions(startLedger: number, endLedger: number) {
    const { oldestLedger, latestLedger } = await this.server.getTransactions({
      startLedger: await this.getBlockNumber(),
      pagination: { limit: 0 },
    } as unknown as rpc.Api.GetTransactionsRequest);

    if (oldestLedger > startLedger) {
      const end = Math.min(endLedger, oldestLedger);
      this.logger.warn(`RPC node is past requested ledgers, skipping: ${startLedger} - ${end}`);
    }

    if (oldestLedger > endLedger || latestLedger < startLedger) {
      return { startLedger, endLedger, inRange: false };
    }

    startLedger = Math.max(startLedger, oldestLedger);
    endLedger = Math.min(endLedger, latestLedger);

    return { startLedger, endLedger, inRange: true };
  }

  async getInstanceTtl(contract: string | Address | Contract) {
    return (
      await this.getContractData(
        contract,
        xdr.ScVal.scvLedgerKeyContractInstance(),
        (result) => result
      )
    ).liveUntilLedgerSeq;
  }

  async getAddressesToExtendInstanceTtl(
    addresses: string[],
    updateTtlThreshold = LEDGERS_PER_DAY * DAYS_TO_EXTEND_BEFORE
  ) {
    const [currentLedger, ttls] = await Promise.all([
      this.getBlockNumber(),
      Promise.allSettled(addresses.map(this.getInstanceTtl.bind(this))),
    ]);

    const addressesToUpdate = _.zip(addresses, ttls)
      .filter(([_, ttl]) => ttl?.status === "fulfilled")
      .filter(
        ([_, ttl]) =>
          (ttl as PromiseFulfilledResult<number>).value - currentLedger < updateTtlThreshold
      )
      .map(([address]) => address!);

    if (!addressesToUpdate.length) {
      this.logger.info("No contracts to extend instance TTL");
    } else {
      this.logger.log(`Contracts to extend instance TTL: [${addressesToUpdate.join(`,`)}]`);
    }

    return addressesToUpdate;
  }

  // Horizon

  async getNetworkStats(force = false): Promise<Horizon.HorizonApi.FeeStatsResponse | undefined> {
    return await this.horizon?.getNetworkStats(force);
  }
}
