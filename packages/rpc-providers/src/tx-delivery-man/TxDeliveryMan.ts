import { TransactionReceipt, TransactionResponse } from "@ethersproject/providers";
import { loggerFactory, RedstoneCommon, sanitizeLogMessage, Tx } from "@redstone-finance/utils";
import { ethers, providers } from "ethers";
import { getProviderNetworkInfo } from "../common";
import { ProviderWithAgreement } from "../providers/ProviderWithAgreement";
import { ProviderWithFallback } from "../providers/ProviderWithFallback";
import { TxDelivery, TxDeliverySigner } from "./TxDelivery";
import type { TxDeliveryOpts } from "./common";

export type TxDeliveryManSupportedProviders =
  | providers.JsonRpcProvider
  | ProviderWithAgreement
  | ProviderWithFallback;

const logger = loggerFactory("TxDeliveryMan");
const WAITING_FOR_CONFIRMATION_TIMEOUT = 60_000;
const CONFIRMATION_COUNT = 1;

export class TxDeliveryMan implements Tx.ITxDeliveryMan {
  private readonly providers: readonly providers.JsonRpcProvider[];
  private readonly txDeliveriesInProgress = new Map<providers.JsonRpcProvider, boolean>();

  constructor(
    provider: TxDeliveryManSupportedProviders,
    private readonly signer: TxDeliverySigner,
    private readonly opts: TxDeliveryOpts
  ) {
    this.providers = extractProviders(provider);
  }

  /**
   *
   * @param txDeliveryCall {TxDeliveryCall} - all values have to be hex values starting with 0x
   * @param context {deferredCallData {() => Promise<string>}} - if passed is called first time on second attempt.
   * During first attempt callData from txDeliveryCall is used.
   * @returns {TransactionResponse}
   * We are relying on soft confirmations from rpc providers.
   * For strong confirmations (1 block) you have to call result of this function.
   */
  async deliver(
    txDeliveryCall: Tx.TxDeliveryCall,
    context: Tx.TxDeliveryManContext = {}
  ): Promise<() => Promise<TransactionReceipt>> {
    const deliveryPromises = this.providers.map(async (provider) => {
      const deliveryInProgress = this.txDeliveriesInProgress.get(provider);

      if (!deliveryInProgress) {
        return await this.createAndDeliverNewPackage(
          provider,
          txDeliveryCall,
          context.deferredCallData
        );
      } else {
        // we are okay with skipping current delivery, because we are passing
        // dynamically fetched calldata
        // This approach allows to better separate providers errors
        const rpcUrl = getProviderNetworkInfo(provider).url;
        const message = `RpcUrl=${rpcUrl} Delivery in progress; Skipping`;
        logger.log(message);
        throw new Error(message);
      }
    });

    await Promise.any(deliveryPromises);

    const txReceiptPromise = this.waitForTransaction(deliveryPromises);
    this.logTxResponse(txReceiptPromise);

    return () => txReceiptPromise;
  }

  private logTxResponse(txReceipt: Promise<TransactionReceipt>) {
    txReceipt
      .then((receipt) => logger.log(getTxReceiptDesc(receipt)))
      .catch((error) =>
        logger.error(
          `Failed to wait for transaction minting ${RedstoneCommon.stringifyError(error)}`
        )
      );
  }

  private createAndDeliverNewPackage(
    provider: providers.JsonRpcProvider,
    txDeliveryCall: Tx.TxDeliveryCall,
    deferredCallData?: () => Promise<string>
  ) {
    const txDelivery = createTxDelivery(provider, this.signer, this.opts, deferredCallData);

    const deliveryPromise = txDelivery
      .deliver(txDeliveryCall)
      .finally(() => this.txDeliveriesInProgress.set(provider, false));

    this.txDeliveriesInProgress.set(provider, true);

    return deliveryPromise;
  }

  async waitForTransaction(deliveryPromises: Promise<TransactionResponse | undefined>[]) {
    const receipts = (
      await Promise.allSettled(
        deliveryPromises.map(async (txResponsePromise, index) => {
          const txResponse = await txResponsePromise;
          if (txResponse) {
            return await this.providers[index].waitForTransaction(
              txResponse.hash,
              CONFIRMATION_COUNT,
              WAITING_FOR_CONFIRMATION_TIMEOUT
            );
          }
          return undefined;
        })
      )
    )
      .filter((result) => result.status === "fulfilled")
      .filter((result) => RedstoneCommon.isDefined(result.value))
      .map((result) => result.value) as TransactionReceipt[];

    const hashes = Array.from(new Set(receipts.map((r) => r.transactionHash)));

    if (hashes.length === 0) {
      throw new Error("Transaction was mined but reverted with error OR we failed to fetch it.");
    }

    if (hashes.length > 1) {
      throw new Error(
        `Network between rpcs is forked - received more than one successful receipts (${receipts.length}). Possible transactions: ${hashes.join(", ")}`
      );
    }

    return receipts[0];
  }
}

function extractProviders(
  provider: TxDeliveryManSupportedProviders
): readonly ethers.providers.JsonRpcProvider[] {
  if (provider instanceof ProviderWithFallback || provider instanceof ProviderWithAgreement) {
    return Object.freeze(provider.providers) as ethers.providers.JsonRpcProvider[];
  }
  return Object.freeze([provider]);
}

function createTxDelivery(
  provider: providers.JsonRpcProvider,
  signer: TxDeliverySigner,
  opts: TxDeliveryOpts,
  deferredCallData?: () => Promise<string>
): TxDelivery {
  const rpcUrl = getProviderNetworkInfo(provider).url;
  return new TxDelivery(
    {
      ...opts,
      logger: (msg) => logger.log(`RpcUrl=${sanitizeLogMessage(rpcUrl)}, ${msg}`),
    },
    signer,
    provider,
    deferredCallData
  );
}

const getTxReceiptDesc = (receipt: TransactionReceipt) => {
  return `Transaction ${receipt.transactionHash} mined with SUCCESS(status: ${
    receipt.status
  }) in block #${receipt.blockNumber}[tx index: ${
    receipt.transactionIndex
  }]. gas_used=${receipt.gasUsed.toString()} effective_gas_price=${receipt.effectiveGasPrice.toString()} confirmations=${receipt.confirmations}`;
};
