import { RedstoneCommon } from "@redstone-finance/utils";
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  Operation,
  rpc,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Api } from "@stellar/stellar-sdk/lib/minimal/rpc/api";
import axios from "axios";
import z from "zod";
import * as XdrUtils from "../XdrUtils";
import { LEDGER_TIME_MS } from "./StellarConstants";
import { StellarSigner } from "./StellarSigner";

const RETRY_COUNT = 10;
const SLEEP_TIME_MS = 1_000;
const TIMEOUT_SEC = 30;

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: RETRY_COUNT,
  waitBetweenMs: SLEEP_TIME_MS,
};

const REDSTONE_EVENT_TOPIC_QUALIFIER = "REDSTONE";

export class StellarRpcClient {
  private cachedNetworkStats?: { value?: Horizon.HorizonApi.FeeStatsResponse; timestamp: number };

  constructor(
    private readonly server: rpc.Server,
    private readonly horizon?: Horizon.Server
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

  async waitForTx(hash: string) {
    return await RedstoneCommon.retry({
      fn: async () => {
        const response = await this.server.getTransaction(hash);
        if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          return {
            returnValue: response.returnValue,
            cost: response.resultXdr.feeCharged(),
          };
        }

        throw new Error(`Transaction did not succeed: ${hash}, status: ${response.status}`);
      },
      ...RETRY_CONFIG,
    })();
  }

  async simulateTransaction(transaction: Transaction) {
    const sim = await this.server.simulateTransaction(transaction);

    if (!rpc.Api.isSimulationSuccess(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    return sim;
  }

  async executeOperation(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    signer: StellarSigner,
    fee = BASE_FEE
  ) {
    const transaction = await this.transactionFromOperation(
      operation,
      await signer.publicKey(),
      fee
    );

    await signer.sign(transaction);

    return await this.server.sendTransaction(transaction);
  }

  async transactionFromOperation(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string,
    fee = BASE_FEE,
    timeout = TIMEOUT_SEC
  ) {
    const tx = new TransactionBuilder(await this.getAccount(sender), {
      fee,
      networkPassphrase: (await this.server.getNetwork()).passphrase,
    })
      .addOperation(operation)
      .setTimeout(timeout)
      .build();

    const sim = await this.simulateTransaction(tx);

    return rpc.assembleTransaction(tx, sim).build();
  }

  async simulateOperation<T>(
    operation: xdr.Operation<Operation.InvokeHostFunction>,
    sender: string,
    transform: (sim: rpc.Api.SimulateTransactionSuccessResponse) => T
  ) {
    const tx = await this.transactionFromOperation(operation, sender);

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

  async transferXlm(sender: StellarSigner, destination: string, amount: number) {
    const senderAccount = await this.server.getAccount(await sender.publicKey());

    const transaction = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: (await this.server.getNetwork()).passphrase,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: Asset.native(),
          amount: String(amount),
        })
      )
      .setTimeout(TIMEOUT_SEC)
      .build();

    await sender.sign(transaction);
    const result = await this.server.sendTransaction(transaction);

    await this.waitForTx(result.hash);
    return result.hash;
  }

  async createAccountWithFunds(sender: StellarSigner, destination: string, amount: number) {
    const senderAccount = await this.server.getAccount(await sender.publicKey());

    const transaction = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: (await this.server.getNetwork()).passphrase,
    })
      .addOperation(
        Operation.createAccount({
          destination,
          startingBalance: String(amount),
        })
      )
      .setTimeout(TIMEOUT_SEC)
      .build();

    await sender.sign(transaction);
    const result = await this.server.sendTransaction(transaction);

    await this.waitForTx(result.hash);
    return result.hash;
  }

  async getTimeForBlock(sequence: number) {
    // TODO: Use Stellar SDK's rpc.Server when it adds support for getLedgers()
    // For the time being we call getLedgers API ourselves
    // <https://github.com/stellar/js-stellar-sdk/issues/944>
    // <https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getLedgers>

    try {
      const req = {
        jsonrpc: "2.0",
        id: 1,
        method: "getLedgers",
        params: {
          startLedger: sequence,
          pagination: {
            limit: 1,
          },
        },
      };

      const res = await axios.post(this.server.serverURL.href(), req);

      const Response = z.object({
        jsonrpc: z.literal("2.0"),
        id: z.literal(1),
        result: z.object({
          ledgers: z.array(
            z.object({
              sequence: z.literal(sequence),
              ledgerCloseTime: z.string(),
            })
          ),
        }),
      });
      const resParsed = Response.parse(res.data);

      return new Date(Number(resParsed.result.ledgers[0].ledgerCloseTime) * 1000);
    } catch {
      console.warn(`Could not get time of ledger ${sequence}`);
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
      console.log(`Fetching data of ${lastLedger} up to ${endLedger}`);
      // TODO: Remove `as unknown as Request` hack when Stellar SDK fixes rpc.Server.getTransactions()
      // It is bugged right now and does not support pagination correctly.
      // Thankfully we can hack around it.

      const req = {
        pagination: { cursor, limit: FETCHING_LIMIT },
      } as unknown as rpc.Api.GetTransactionsRequest;
      const result = await this.server.getTransactions(req);
      cursor = result.cursor;
      lastLedger = result.transactions.at(-1)?.ledger;
      transactions = transactions.concat(result.transactions);
    }

    return transactions.filter(({ ledger }) => ledger >= startLedger && ledger <= endLedger);
  }

  async getEvents(
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
      console.log(
        `Getting events with ${currentCursor ? currentCursor : `limit: ${FETCHING_LIMIT}`}`
      );
      const filters: Api.EventFilter[] = [
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

    return allEvents;
  }

  private async fixLedgerVersions(startLedger: number, endLedger: number) {
    const { oldestLedger, latestLedger } = await this.server.getTransactions({
      startLedger: await this.getBlockNumber(),
      pagination: { limit: 0 },
    } as unknown as rpc.Api.GetTransactionsRequest);

    if (oldestLedger > startLedger) {
      const end = Math.min(endLedger, oldestLedger);
      console.warn(`RPC node is past requested ledgers, skipping: ${startLedger} - ${end}`);
    }

    if (oldestLedger > endLedger || latestLedger < startLedger) {
      return { startLedger, endLedger, inRange: false };
    }

    startLedger = Math.max(startLedger, oldestLedger);
    endLedger = Math.min(endLedger, latestLedger);

    return { startLedger, endLedger, inRange: true };
  }

  async sendTransaction(tx: Transaction) {
    return await this.server.sendTransaction(tx);
  }

  async getNetworkStats(force = false) {
    const now = Date.now();
    if (
      force ||
      this.cachedNetworkStats === undefined ||
      now - this.cachedNetworkStats.timestamp > LEDGER_TIME_MS
    ) {
      this.cachedNetworkStats = {
        value: await this.horizon?.feeStats(),
        timestamp: now,
      };
    }

    return this.cachedNetworkStats.value;
  }
}
