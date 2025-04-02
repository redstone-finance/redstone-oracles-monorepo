import {
  GatewayApiClient,
  LedgerStateSelector,
  StateEntityDetailsResponseComponentDetails,
} from "@radixdlt/babylon-gateway-api-sdk";
import { Convert, NetworkId, Value } from "@radixdlt/radix-engine-toolkit";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { RadixParser } from "./parser/RadixParser";

const APPLICATION_NAME = "RedStone Radix Connector";

const SINGLE_EXECUTION_TIMEOUT_MS = 7_000;
const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;
const BLOCK_NUMBER_EXECUTION_TIMEOUT_MS = 1_500;

export class RadixApiClient {
  readonly apiClient: GatewayApiClient;

  static makeMultiExecutor(
    urls: (string | undefined)[],
    networkId = NetworkId.Stokenet,
    config = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ): RadixApiClient {
    const ceilMedianConsensusExecutor =
      new MultiExecutor.CeilMedianConsensusExecutor(
        MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
        BLOCK_NUMBER_EXECUTION_TIMEOUT_MS
      );
    return MultiExecutor.create(
      urls.map((url) => new RadixApiClient(networkId, url)),
      {
        getCurrentStateVersion: ceilMedianConsensusExecutor,
        getCurrentEpochNumber: ceilMedianConsensusExecutor,
        submitTransaction: MultiExecutor.ExecutionMode.RACE,
        getTransactionStatus: MultiExecutor.ExecutionMode.AGREEMENT,
        getFungibleBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getNonFungibleBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getStateFields: MultiExecutor.ExecutionMode.AGREEMENT,
      },
      { ...MultiExecutor.DEFAULT_CONFIG, ...config }
    );
  }

  constructor(
    private networkId = NetworkId.Stokenet,
    basePath?: string
  ) {
    this.apiClient = GatewayApiClient.initialize({
      applicationName: APPLICATION_NAME,
      networkId,
      basePath,
    });
  }

  async getTransactionDetails(transactionId: string) {
    const receipt =
      await this.apiClient.transaction.innerClient.transactionCommittedDetails({
        transactionCommittedDetailsRequest: {
          intent_hash: transactionId,
          opt_ins: { receipt_output: true },
        },
      });

    if (receipt.transaction.transaction_status !== "CommittedSuccess") {
      throw new Error(
        receipt.transaction.error_message ??
          receipt.transaction.transaction_status
      );
    }

    const output = receipt.transaction.receipt?.output as {
      hex: string;
    }[];

    return {
      values: (
        await Promise.all(
          output.map((object) =>
            RadixParser.decodeSborHex(object.hex, this.networkId)
          )
        )
      ).map((value) => RadixParser.extractValue(value)),
      feePaid: receipt.transaction.fee_paid,
    };
  }

  async submitTransaction(compiledTransaction: Uint8Array) {
    const notarizedTransactionHex =
      Convert.Uint8Array.toHexString(compiledTransaction);

    return (
      await this.apiClient.transaction.innerClient.transactionSubmit({
        transactionSubmitRequest: {
          notarized_transaction_hex: notarizedTransactionHex,
        },
      })
    ).duplicate;
  }

  async getTransactionStatus(transactionId: string) {
    const result =
      await this.apiClient.transaction.innerClient.transactionStatus({
        transactionStatusRequest: {
          intent_hash: transactionId,
        },
      });

    return { status: result.intent_status, errorMessage: result.error_message };
  }

  async getCurrentEpochNumber() {
    return (await this.getCurrentLedgerState()).epoch;
  }

  async getCurrentStateVersion() {
    return (await this.getCurrentLedgerState()).state_version;
  }

  private async getCurrentLedgerState() {
    return (await this.apiClient.status.getCurrent()).ledger_state;
  }

  async getFungibleBalance(
    address: string,
    resourceAddress: string,
    stateVersion?: number
  ): Promise<string> {
    const atLedgerState = await this.waitForLedgerState(stateVersion);

    const response =
      await this.apiClient.state.innerClient.entityFungibleResourceVaultPage({
        stateEntityFungibleResourceVaultsPageRequest: {
          address,
          resource_address: resourceAddress,
          at_ledger_state: atLedgerState,
        },
      });

    switch (response.items.length) {
      case 0:
        return "0";
      case 1:
        return response.items[0].amount;
      default:
        throw new Error(
          `Unexpected item count: ${response.items.length} for ${resourceAddress}`
        );
    }
  }

  async getNonFungibleBalance(
    address: string,
    resourceAddress: string,
    stateVersion?: number
  ) {
    const atLedgerState = await this.waitForLedgerState(stateVersion);

    const response =
      await this.apiClient.state.innerClient.entityNonFungibleResourceVaultPage(
        {
          stateEntityNonFungibleResourceVaultsPageRequest: {
            address,
            resource_address: resourceAddress,
            at_ledger_state: atLedgerState,
          },
        }
      );

    switch (response.items.length) {
      case 0:
        return 0;
      case 1:
        return response.items[0].total_count;
      default:
        throw new Error(
          `Unexpected item count: ${response.items.length} for ${resourceAddress}`
        );
    }
  }

  async getTransactions(
    fromStateVersion: number,
    atStateVersion: number,
    addresses: string[],
    cursor?: string | null
  ) {
    RedstoneCommon.assertWithLog(
      atStateVersion >= fromStateVersion,
      `atStateVersion must be >= fromStateVersion`
    );

    const atLedgerState = await this.waitForLedgerState(atStateVersion);

    return await this.apiClient.stream.innerClient.streamTransactions({
      streamTransactionsRequest: {
        cursor,
        from_ledger_state: { state_version: fromStateVersion },
        at_ledger_state: atLedgerState,
        affected_global_entities_filter: addresses,
        opt_ins: {
          raw_hex: true,
          affected_global_entities: true,
          receipt_costing_parameters: true,
          receipt_fee_summary: true,
        },
      },
    });
  }

  async getStateFields(
    componentId: string,
    fieldNames?: string[],
    stateVersion?: number
  ) {
    const ledgerState = await this.waitForLedgerState(
      stateVersion,
      `getStateFields ${fieldNames?.toString()} in ${stateVersion}`
    );
    const res = await this.apiClient.state.getEntityDetailsVaultAggregated(
      componentId,
      undefined,
      ledgerState
    );
    const state = (
      res.details as unknown as StateEntityDetailsResponseComponentDetails
    ).state as { fields: { field_name: string }[] };

    const fields = state.fields.filter(
      (field) => fieldNames?.includes(field.field_name) !== false
    );
    const entries = fields.map((field) => [
      field.field_name,
      RadixParser.convertValue(field),
    ]);

    return Object.fromEntries(entries) as { [p: string]: Value };
  }

  private async waitForLedgerState(
    stateVersion: number | undefined,
    description?: string
  ) {
    await RedstoneCommon.waitForBlockNumber(
      () => this.getCurrentStateVersion(),
      stateVersion,
      description
    );

    if (!stateVersion) {
      return undefined;
    }

    return { state_version: stateVersion } as LedgerStateSelector;
  }
}
