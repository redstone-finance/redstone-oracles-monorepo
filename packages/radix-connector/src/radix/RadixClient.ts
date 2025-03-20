import { StreamTransactionsResponse } from "@radixdlt/babylon-gateway-api-sdk";
import {
  defaultValidationConfig,
  generateRandomNonce,
  NetworkId,
  NotarizedTransaction,
  PrivateKey,
  RadixEngineToolkit,
  TransactionBuilder,
  TransactionHeader,
} from "@radixdlt/radix-engine-toolkit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { hexlify } from "ethers/lib/utils";
import { RadixApiClient } from "./RadixApiClient";
import {
  ALLOWED_FORWARD_EPOCH_COUNT,
  DEFAULT_RADIX_CLIENT_CONFIG,
  MAX_TIP_PERCENTAGE,
} from "./RadixClientConfig";
import { RadixInvocation } from "./RadixInvocation";
import { RadixTransaction } from "./RadixTransaction";

export interface RadixPrivateKey {
  scheme: "secp256k1" | "ed25519";
  value: string;
}

export class RadixClient {
  protected readonly logger = loggerFactory("RadixClient");
  protected readonly signer?: PrivateKey;

  constructor(
    protected readonly apiClient: RadixApiClient,
    protected networkId = NetworkId.Stokenet,
    readonly privateKey: RadixPrivateKey | undefined,
    protected config = DEFAULT_RADIX_CLIENT_CONFIG
  ) {
    this.signer = RadixClient.makeSigner(privateKey);
  }

  private static makeSigner(privateKey?: RadixPrivateKey) {
    if (!privateKey) {
      return;
    }

    switch (privateKey.scheme) {
      case "ed25519":
        return new PrivateKey.Ed25519(privateKey.value);
      case "secp256k1":
        return new PrivateKey.Secp256k1(privateKey.value);
    }
  }

  static async getAddressDataHex(addressString: string) {
    const entity = await RadixEngineToolkit.Address.decode(addressString);

    return hexlify(entity.data).substring(2);
  }

  async call<T>(
    method: RadixInvocation<T>,
    proofResourceId?: string
  ): Promise<T> {
    return await this.callWithProvider(
      () => Promise.resolve(method),
      proofResourceId
    );
  }

  async callWithProvider<T>(
    invocationProvider: () => Promise<RadixInvocation<T>>,
    proofResourceId?: string
  ) {
    for (
      let iterationIndex = 0;
      iterationIndex < this.config.maxTxSendAttempts;
      iterationIndex++
    ) {
      try {
        const invocation = await invocationProvider();
        const transaction = invocation.getDedicatedTransaction(
          await this.getAccountAddress(),
          this.config.maxFeeXrd,
          proofResourceId
        );
        const transactionHash = await this.callTransaction(
          transaction,
          iterationIndex
        );
        const result = await this.waitForCommit(transactionHash.id);

        if (result) {
          return await this.interpret<T>(transactionHash.id, transaction);
        }
      } catch (e) {
        this.logger.error(RedstoneCommon.stringifyError(e));
      }
    }

    throw new Error(
      `No transaction success found in ${this.config.maxTxSendAttempts} iteration${RedstoneCommon.getS(this.config.maxTxSendAttempts)}`
    );
  }

  private async interpret<T>(
    transactionId: string,
    transaction: RadixTransaction
  ) {
    const output = await this.apiClient.getTransactionDetails(transactionId);

    return transaction.interpret(output) as T;
  }

  async readValue<T>(
    componentId: string,
    fieldName: string,
    stateVersion?: number
  ) {
    return (
      await this.apiClient.getStateFields(
        componentId,
        [fieldName],
        stateVersion
      )
    )[fieldName] as T;
  }

  async getCurrentEpochNumber() {
    return await this.apiClient.getCurrentEpochNumber();
  }

  async getCurrentStateVersion() {
    return await this.apiClient.getCurrentStateVersion();
  }

  async getXRDBalance(address: string, stateVersion?: number) {
    const addressBook = await RadixEngineToolkit.Utils.knownAddresses(
      this.networkId
    );
    return await this.apiClient.getFungibleBalance(
      address,
      addressBook.resourceAddresses.xrd,
      stateVersion
    );
  }

  async getResourceBalance(
    address: string,
    resourceAddress: string,
    stateVersion?: number
  ) {
    return await this.apiClient.getNonFungibleBalance(
      address,
      resourceAddress,
      stateVersion
    );
  }

  async getTransactions(
    fromStateVersion: number,
    toStateVersion: number,
    addresses: string[]
  ) {
    let accumulatedResult: StreamTransactionsResponse | undefined = undefined;
    do {
      const result = await this.apiClient.getTransactions(
        fromStateVersion,
        toStateVersion + 1, // +1 because it's "<" relation
        addresses,
        accumulatedResult?.next_cursor
      );

      if (!accumulatedResult) {
        accumulatedResult = result;
      } else {
        accumulatedResult.next_cursor = result.next_cursor;
        accumulatedResult.items.push(...result.items);
      }
    } while (accumulatedResult.next_cursor);

    return accumulatedResult;
  }

  async waitForCommit(transactionId: string, pollDelayMs = 500) {
    try {
      return await this.performWaitingForCommit(
        transactionId,
        pollDelayMs,
        this.config.maxTxWaitingTimeMs / pollDelayMs
      );
    } catch (e) {
      this.logger.error(e);

      return false;
    }
  }

  private async performWaitingForCommit(
    transactionId: string,
    pollDelayMs: number,
    pollAttempts: number
  ) {
    for (let i = 0; i < pollAttempts; i++) {
      const statusOutput =
        await this.apiClient.getTransactionStatus(transactionId);
      const logMessage = `Transaction ${transactionId} is ${statusOutput.status}`;
      switch (statusOutput.status) {
        case "Pending":
        case "CommitPendingOutcomeUnknown": {
          this.logger.debug(logMessage);
          break;
        }
        case "CommittedSuccess": {
          this.logger.log(logMessage);
          return true;
        }
        case "CommittedFailure":
          throw new Error(
            `Transaction ${transactionId} failed: ${statusOutput.errorMessage}`
          );
        default:
          this.logger.log(logMessage);
      }
      await RedstoneCommon.sleep(pollDelayMs);
    }

    throw new Error(
      `Transaction ${transactionId} was not committed during ${pollDelayMs * pollAttempts} [ms]`
    );
  }

  async getAccountAddress() {
    return await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
      this.getPublicKey(),
      this.networkId
    );
  }

  getPublicKeyHex() {
    return this.signer?.publicKeyHex();
  }

  protected getPublicKey() {
    if (!this.signer) {
      throw new Error("No signer or private key passed");
    }

    return this.signer.publicKey();
  }

  private getTipPercentage(iterationIndex = 0) {
    return Math.floor(
      Math.min(
        100 * (this.config.tipMultiplier ** iterationIndex - 1),
        MAX_TIP_PERCENTAGE
      )
    );
  }

  private async callTransaction(
    transaction: RadixTransaction,
    iterationIndex = 0
  ) {
    const currentEpochNumber = await this.apiClient.getCurrentEpochNumber();
    const transactionHeader: TransactionHeader = {
      networkId: this.networkId,
      startEpochInclusive: currentEpochNumber,
      endEpochExclusive: currentEpochNumber + ALLOWED_FORWARD_EPOCH_COUNT,
      nonce: generateRandomNonce(),
      notaryPublicKey: this.getPublicKey(),
      notaryIsSignatory: true,
      tipPercentage: this.getTipPercentage(iterationIndex),
    };

    const notarizedTransaction: NotarizedTransaction =
      await TransactionBuilder.new().then((builder) =>
        builder
          .header(transactionHeader)
          .manifest(transaction.getManifest())
          .notarize(this.signer!)
      );

    await RadixEngineToolkit.NotarizedTransaction.staticallyValidate(
      notarizedTransaction,
      defaultValidationConfig(this.networkId)
    ).then((validation) => {
      if (validation.kind === "Invalid") {
        throw new Error(
          `Transaction is invalid: ${RedstoneCommon.stringifyError(validation.error)}`
        );
      }
    });

    const transactionId =
      await RadixEngineToolkit.NotarizedTransaction.intentHash(
        notarizedTransaction
      );
    this.logger.log(`Transaction ${transactionId.id} sent.`);

    const compiled =
      await RadixEngineToolkit.NotarizedTransaction.compile(
        notarizedTransaction
      );

    const duplicate = await this.apiClient.submitTransaction(compiled);
    if (duplicate) {
      this.logger.info(`Transaction ${transactionId.id} was a duplicate`);
    }

    return transactionId;
  }
}
