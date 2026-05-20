import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { consts } from "@redstone-finance/protocol";
import { Address, rpc, xdr } from "@stellar/stellar-sdk";
import { hexlify } from "ethers/lib/utils";
import { StellarClient } from "./StellarClient";

export class StellarTxLookup implements TxLookup {
  constructor(private readonly client: StellarClient) {}

  async fetchPage({ adapterContract, startBlock, endBlock }: TxLookupArgs) {
    const events = await this.client.getEventsWithTransactions(startBlock, endBlock);
    const data = events.flatMap(({ tx }) => StellarTxLookup.normalize(tx, adapterContract));

    return { data, hasNextPage: false };
  }

  private static normalize(tx: rpc.Api.TransactionInfo, adapterContract: string) {
    let ops: xdr.Operation[] = [];
    try {
      ops = tx.envelopeXdr.v1().tx().operations();
    } catch {
      return [];
    }

    const isFailed = tx.status !== rpc.Api.GetTransactionStatus.SUCCESS;
    const gasUsed = Number(tx.resultXdr.feeCharged().toBigInt());
    const gasLimit = String(tx.envelopeXdr.v1().tx().fee());

    return ops.flatMap((op) => {
      try {
        const invokeContract = op.body().invokeHostFunctionOp().hostFunction().invokeContract();
        const payload = findRedStonePayload(invokeContract.args());
        if (payload === undefined) {
          return [];
        }

        const to = Address.fromScAddress(invokeContract.contractAddress()).toString();
        if (to !== adapterContract) {
          return [];
        }

        const sourceAccount = op.sourceAccount() ?? tx.envelopeXdr.v1().tx().sourceAccount();

        return [
          {
            blockNumber: tx.ledger,
            blockTimestamp: Number(tx.createdAt),
            hash: tx.txHash,
            from: Address.account(sourceAccount.ed25519()).toString(),
            to,
            data: payload.toString("hex"),
            gasLimit,
            gasPrice: "0",
            isFailed,
            gasUsed,
          },
        ];
      } catch {
        return [];
      }
    });
  }
}

function findRedStonePayload(args: xdr.ScVal[]) {
  try {
    const bytes = args.at(-1)?.bytes();
    if (bytes !== undefined && hexlify(bytes).endsWith(consts.REDSTONE_MARKER_HEX_PURE)) {
      return bytes;
    }
  } catch {
    /* not a RedStone transaction */
  }

  return undefined;
}
