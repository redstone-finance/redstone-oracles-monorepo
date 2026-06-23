import { Collector, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  type Horizon,
  Keypair,
  Operation,
  rpc,
  SorobanDataBuilder,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import _ from "lodash";
import { StellarSigner } from "../stellar/StellarSigner";
import { getLedgerCloseDate } from "../utils";
import * as XdrUtils from "../XdrUtils";
import { parseSimValAs } from "../XdrUtils";
import { BlockNumberProvider } from "./BlockNumberProvider";
import { HorizonClient } from "./HorizonClient";
import { IStellarCaller, StellarInvocation } from "./IStellarCaller";
import { LedgerEntriesCollector, LedgerEntriesCollectorDelegate } from "./LedgerEntriesCollector";

export const SECS_PER_LEDGER = 5;
export const LEDGERS_PER_DAY = RedstoneCommon.hourToSecs(24) / SECS_PER_LEDGER;
const REDSTONE_EVENT_TOPIC_QUALIFIER = "REDSTONE";
const TRANSACTION_TIMEOUT_SEC = 30;
const DAYS_TO_EXTEND_TTL_THRESHOLD = 7;
const DAYS_TO_EXTEND_TTL = 30;
const BASE_EXTEND_TTL_FEE = 1e7;
const RANDOM_ACCOUNT_FOR_SIMULATION = new Account(Keypair.random().publicKey(), "1");

export class StellarClient implements IStellarCaller, LedgerEntriesCollectorDelegate {
  private readonly logger = loggerFactory("stellar-client");
  private readonly blockNumberProvider: BlockNumberProvider;
  private readonly ledgerEntriesCollector = new Collector.CollectorRegistry(
    (blockNumber?: number) => String(blockNumber ?? "latest"),
    (blockNumber?: number) => {
      const collector = new LedgerEntriesCollector(blockNumber);
      collector.delegate = new WeakRef(this);

      return collector;
    }
  );

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
    private readonly horizon?: HorizonClient,
    private readonly multicall?: IStellarCaller
  ) {
    this.blockNumberProvider = new BlockNumberProvider(server);
  }

  dispose() {
    this.ledgerEntriesCollector.disposeAll();
  }

  private async getAccount(publicKey: string) {
    return await this.server.getAccount(publicKey);
  }

  async getAccountBalance(address: string) {
    const ledgerKey = XdrUtils.ledgerKeyFromAddress(address);

    const response = await this.fetchEntriesByKey([ledgerKey]);

    const entry = response.at(0);
    if (!entry) {
      throw new Error("Empty response");
    }

    return XdrUtils.accountFromEntry(entry).balance().toBigInt();
  }

  async getBlockNumber() {
    return await this.blockNumberProvider.getBlockNumber();
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
    return await this.server
      .pollTransaction(hash)
      .then((result) => ({ status: result.status, txHash: result.txHash }));
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
    timeout = TRANSACTION_TIMEOUT_SEC,
    sorobanData?: xdr.SorobanTransactionData
  ) {
    if (typeof signer !== "string") {
      signer = await signer.publicKey();
    }

    const tx = await this.buildTransaction(operation, signer, fee, timeout, sorobanData);

    return await this.server.prepareTransaction(tx);
  }

  async prepareSignedTransaction(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    signer: StellarSigner,
    fee = BASE_FEE,
    timeout = TRANSACTION_TIMEOUT_SEC,
    sorobanData?: xdr.SorobanTransactionData
  ) {
    const transaction = await this.prepareTransaction(operation, signer, fee, timeout, sorobanData);

    await signer.sign(transaction);

    return transaction;
  }

  async buildTransaction(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string | Account,
    fee = BASE_FEE,
    timeout = TRANSACTION_TIMEOUT_SEC,
    sorobanData?: xdr.SorobanTransactionData
  ) {
    const account = typeof sender === "string" ? await this.getAccount(sender) : sender;
    const builder = new TransactionBuilder(account, {
      fee,
      networkPassphrase: (await this.getNetwork()).passphrase,
    })
      .addOperation(operation)
      .setTimeout(timeout);

    return (sorobanData ? builder.setSorobanData(sorobanData) : builder).build();
  }

  async waitForBlockNumber(blockNumber?: number) {
    await this.blockNumberProvider.waitForBlockNumber(blockNumber);
  }

  async call<T>(
    invocation: StellarInvocation,
    blockNumber?: number,
    transform = (retVal: unknown) => retVal as T
  ) {
    return this.multicall
      ? await this.multicall.call(invocation, blockNumber, transform)
      : await this.simulateInvocation(invocation, blockNumber, transform);
  }

  async simulateInvocation<T>(
    invocation: StellarInvocation,
    blockNumber: number | undefined,
    transform = (retVal: unknown) => retVal as T
  ) {
    const operation = invocation.contract.call(invocation.method, ...(invocation.args ?? []));

    return await this.simulateOperation(
      operation,
      RANDOM_ACCOUNT_FOR_SIMULATION,
      transform,
      blockNumber
    );
  }

  async simulateOperation<T>(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string | Account,
    transform: (retVal: unknown) => T,
    blockNumber?: number
  ) {
    const tx = await this.buildTransaction(operation, sender);

    await this.waitForBlockNumber(blockNumber);

    return parseSimValAs(await this.simulateTransaction(tx), transform);
  }

  async getContractData<T>(
    contract: string | Address | Contract,
    key: xdr.ScVal,
    transform: (result: rpc.Api.LedgerEntryResult) => T,
    durability?: rpc.Durability,
    blockNumber?: number
  ) {
    const ledgerKey = contractDataKey(contract, key, toXdrDurability(durability));
    const [entry] = await this.fetchEntriesByKey([ledgerKey], blockNumber);

    if (!entry) {
      throw new Error(`No contract data entry for key ${key.toXDR("base64")}`);
    }

    return transform(entry);
  }

  async getContractEntries(
    contract: string | Address | Contract,
    feeds: xdr.ScVal[],
    blockNumber?: number
  ) {
    const keys = feeds.map((feed) => contractDataKey(contract, feed));
    const entries = await this.fetchEntriesByKey(keys, blockNumber);

    return entries.map((entry) =>
      entry ? XdrUtils.maybeParsePriceDataFromContractData(entry) : undefined
    );
  }

  async fetchEntriesByKey(keys: xdr.LedgerKey[], blockNumber?: number) {
    return await this.ledgerEntriesCollector.get(blockNumber).collectMany(keys);
  }

  /// LedgerEntriesCollectorDelegate

  async ledgerEntriesCollectorGetLedgerEntries(keys: xdr.LedgerKey[], blockNumber?: number) {
    if (keys.length === 0) {
      return [];
    }

    await this.blockNumberProvider.waitForBlockNumber(blockNumber);

    const { entries = [] } = await this.server.getLedgerEntries(...keys);
    const byKey = new Map(entries.map((entry) => [entry.key.toXDR("base64"), entry]));

    return keys.map((key) => byKey.get(key.toXDR("base64")));
  }

  ledgerEntriesCollectorDispose(blockNumber?: number) {
    if (RedstoneCommon.isDefined(blockNumber)) {
      this.ledgerEntriesCollector.delete(blockNumber);
    }
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
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    fee = BASE_FEE,
    timeout = TRANSACTION_TIMEOUT_SEC,
    sorobanData?: xdr.SorobanTransactionData
  ) {
    const transaction = await this.buildTransaction(
      operation,
      await sender.publicKey(),
      fee,
      timeout,
      sorobanData
    );

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
    });
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
    let hasMoreEvents;

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

    const uniqueHashes = [...new Set(allEvents.map((e) => e.txHash))];
    const txEntries = await Promise.all(
      uniqueHashes.map(async (txHash) => {
        const tx = await this.server.getTransaction(txHash);
        if (tx.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
          throw new Error(`Transaction ${txHash} not found`);
        }

        return [txHash, tx] as const;
      })
    );
    const txByHash = new Map(txEntries);

    return allEvents.map((event) => ({ event, tx: txByHash.get(event.txHash)! }));
  }

  private async fixLedgerVersions(startLedger: number, endLedger: number) {
    const { oldestLedger, latestLedger } = await this.server.getTransactions({
      startLedger: await this.getBlockNumber(),
      pagination: { limit: 0 },
    });

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

  async getInstanceTtl(contract: string | Address | Contract, blockNumber?: number) {
    const [ttl] = await this.getInstanceTtls([contract], blockNumber);

    return ttl;
  }

  async getInstanceTtls(contracts: (string | Address | Contract)[], blockNumber?: number) {
    const keys = contracts.map((contract) =>
      contractDataKey(contract, xdr.ScVal.scvLedgerKeyContractInstance())
    );

    const response = await this.fetchEntriesByKey(keys, blockNumber);

    return response.map((entry) => entry?.liveUntilLedgerSeq);
  }

  async getEntriesTtls(
    contract: string | Address | Contract,
    keys: (xdr.ScVal | "instance")[],
    blockNumber?: number
  ) {
    const ledgerKeys = keys.map((key) =>
      contractDataKey(contract, key === "instance" ? xdr.ScVal.scvLedgerKeyContractInstance() : key)
    );

    const entries = await this.fetchEntriesByKey(ledgerKeys, blockNumber);

    return entries.map((entry) => entry?.liveUntilLedgerSeq);
  }

  async extendInstanceTtl(
    contractId: string,
    signer: StellarSigner,
    extendTo = DAYS_TO_EXTEND_TTL * LEDGERS_PER_DAY,
    fee = BASE_EXTEND_TTL_FEE.toString(),
    timeout = TRANSACTION_TIMEOUT_SEC
  ) {
    const instanceKey = contractDataKey(contractId, xdr.ScVal.scvLedgerKeyContractInstance());

    const operation = Operation.extendFootprintTtl({ extendTo });
    const sorobanData = new SorobanDataBuilder().setReadOnly([instanceKey]).build();
    const transaction = await this.prepareSignedTransaction(
      operation,
      signer,
      fee,
      timeout,
      sorobanData
    );
    const result = await this.sendTransaction(transaction);

    await this.waitForTx(result.hash);

    return result.hash;
  }

  async getAddressesToExtendInstanceTtl(
    addresses: string[],
    currentLedger: number,
    updateTtlThreshold = LEDGERS_PER_DAY * DAYS_TO_EXTEND_TTL_THRESHOLD
  ) {
    const ttls = await this.getInstanceTtls(addresses, currentLedger);

    return _.zip(addresses, ttls)
      .filter(([_, ttl]) => (ttl ?? 0) - currentLedger < updateTtlThreshold) // treat unknown ttl as an error state
      .map(([address]) => address!);
  }

  // Horizon

  async getNetworkStats(force = false): Promise<Horizon.HorizonApi.FeeStatsResponse | undefined> {
    return await this.horizon?.getNetworkStats(force);
  }
}

function toXdrDurability(durability?: rpc.Durability) {
  switch (durability) {
    case rpc.Durability.Temporary:
      return xdr.ContractDataDurability.temporary();
    case rpc.Durability.Persistent:
    case undefined:
      return xdr.ContractDataDurability.persistent();
  }
}

function toScAddress(contract: string | Address | Contract) {
  if (typeof contract === "string") {
    return new Address(contract).toScAddress();
  } else if (contract instanceof Address) {
    return contract.toScAddress();
  } else {
    return contract.address().toScAddress();
  }
}

export function contractDataKey(
  contract: string | Address | Contract,
  key: xdr.ScVal,
  durability = xdr.ContractDataDurability.persistent()
) {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: toScAddress(contract),
      key,
      durability,
    })
  );
}
