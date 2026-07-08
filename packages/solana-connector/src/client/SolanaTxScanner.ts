import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { ConfirmedSignatureInfo, PublicKey } from "@solana/web3.js";
import { SolanaClient } from "./SolanaClient";

export const BOUNDARY_SLOT_WALK_LIMIT = 8;
const TX_FETCHING_BATCH_SIZE = 1000;

export class SolanaTxScanner {
  private readonly logger = loggerFactory("solana-tx-scanner");

  constructor(private readonly client: SolanaClient) {}

  async fetchTransactionsInRange(fromSlot: number, toSlot: number, addresses: Set<string>) {
    const [fromSlotSignature, toSlotSignature] = await Promise.all([
      this.findBoundaryAnchor(fromSlot - 1, -1),
      this.findBoundaryAnchor(toSlot + 1, 1),
    ]);

    const perAddress = await Promise.all(
      [...addresses].map((address) =>
        this.getAllSignatureInfos(address, fromSlotSignature, toSlotSignature)
      )
    );

    const filtered = perAddress.flat().filter((sig) => sig.slot >= fromSlot && sig.slot <= toSlot);

    return await Promise.all(filtered.map((sig) => this.fetchTransaction(sig)));
  }

  private async fetchTransaction({ signature, slot }: ConfirmedSignatureInfo) {
    const tx = await this.client.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!RedstoneCommon.isDefined(tx)) {
      throw new Error(`Could not fetch transaction ${signature} in slot ${slot}`);
    }

    return tx;
  }

  private async findBoundaryAnchor(slot: number, direction: -1 | 1) {
    const stepLimit =
      direction < 0
        ? BOUNDARY_SLOT_WALK_LIMIT
        : Math.min(BOUNDARY_SLOT_WALK_LIMIT, (await this.client.getSlot()) - slot + 1);

    for (let step = 0; step < stepLimit; step++) {
      const signatures = await this.getBlockSignaturesSafely(slot + step * direction);
      const anchor = direction < 0 ? signatures?.at(-1) : signatures?.[0];
      if (anchor) {
        return anchor;
      }
    }

    if (direction < 0) {
      throw new Error(`No block found within ${BOUNDARY_SLOT_WALK_LIMIT} slots below ${slot}`);
    }

    return undefined;
  }

  private async getBlockSignaturesSafely(slot: number) {
    try {
      const { signatures } = await this.client.getBlockSignatures(slot);

      return signatures;
    } catch (error) {
      this.logger.debug(
        `Could not fetch block signatures for slot ${slot}: ${RedstoneCommon.stringifyError(error)}`
      );

      return undefined;
    }
  }

  private async getAllSignatureInfos(
    address: string,
    minTxSig?: string,
    maxTxSig?: string
  ): Promise<ConfirmedSignatureInfo[]> {
    const result = await this.client.getSignaturesForAddress(new PublicKey(address), {
      limit: TX_FETCHING_BATCH_SIZE,
      before: maxTxSig,
      until: minTxSig,
    });

    const oldest = result.at(-1);
    if (result.length === TX_FETCHING_BATCH_SIZE && minTxSig && oldest) {
      const previous = await this.getAllSignatureInfos(address, minTxSig, oldest.signature);
      result.push(...previous);
    }

    return result;
  }
}
