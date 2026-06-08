import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { LEDGERS_PER_DAY, SECS_PER_LEDGER, StellarClient } from "../client/StellarClient";
import { StellarSigner } from "../stellar/StellarSigner";
import { StellarOperationSender } from "../tx/StellarOperationSender";
import { StellarTxDeliveryManConfig } from "../tx/StellarTxDeliveryManConfig";
import { Sep40ContractReader } from "./Sep40ContractReader";

const BLOCK_COUNT_THRESHOLD = LEDGERS_PER_DAY * 2.5;
const EXTEND_FN = "extend_entries_ttl";

export class Sep40TtlExtender {
  static readonly logger = loggerFactory("stellar-sep-40-extender");

  readonly reader: Sep40ContractReader;
  private readonly operationSender: StellarOperationSender;
  private readonly contract: Contract;

  constructor(
    private readonly client: StellarClient,
    contract: string,
    keypair: Keypair,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    this.contract = new Contract(contract);
    this.reader = new Sep40ContractReader(client, this.contract);
    this.operationSender = new StellarOperationSender(new StellarSigner(keypair), client, config);
  }

  async extendTtlIfNeeded() {
    const contractId = this.contract.address().toString();
    const blockNumber = await this.client.getBlockNumber();
    const oldestTtl = await this.reader.closestTtlToDeadline(blockNumber);

    const blocksRemaining = oldestTtl - blockNumber;
    const shouldExtend = oldestTtl <= blockNumber + BLOCK_COUNT_THRESHOLD;

    Sep40TtlExtender.logger.info(
      `[${contractId}] block: #${blockNumber}, oldest TTL: #${oldestTtl}, ` +
        `${blocksRemaining} blocks (${blocksToHours(blocksRemaining)}h) remaining — should-extend = ${shouldExtend}`
    );

    if (!shouldExtend) {
      return;
    }

    Sep40TtlExtender.logger.info(`[${contractId}] Extending TTL...`);
    await this.operationSender.sendTransaction(this.contract.call(EXTEND_FN));
    Sep40TtlExtender.logger.info(`[${contractId}] TTL extended successfully`);
  }
}

function blocksToHours(blocks: number) {
  return RedstoneCommon.secsToHours(blocks * SECS_PER_LEDGER).toFixed(1);
}
