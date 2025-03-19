import {
  GatewayApiClient,
  LedgerStateSelector,
  StateEntityDetailsResponseComponentDetails,
} from "@radixdlt/babylon-gateway-api-sdk";
import { Convert, NetworkId, Value } from "@radixdlt/radix-engine-toolkit";
import { RadixParser } from "./parser/RadixParser";

export class RadixApiClient {
  readonly apiClient: GatewayApiClient;

  constructor(
    applicationName: string,
    private networkId = NetworkId.Stokenet,
    basePath?: string
  ) {
    this.apiClient = GatewayApiClient.initialize({
      applicationName,
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

    return (
      await Promise.all(
        output.map((object) =>
          RadixParser.decodeSborHex(object.hex, this.networkId)
        )
      )
    ).map((value) => RadixParser.extractValue(value));
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
    return await this.apiClient.transaction.innerClient.transactionStatus({
      transactionStatusRequest: {
        intent_hash: transactionId,
      },
    });
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
    const response =
      await this.apiClient.state.innerClient.entityFungibleResourceVaultPage({
        stateEntityFungibleResourceVaultsPageRequest: {
          address,
          resource_address: resourceAddress,
          at_ledger_state: RadixApiClient.makeLedgerState(stateVersion),
        },
      });

    if (response.items.length !== 1) {
      return "0";
    }

    return response.items[0].amount;
  }

  async getNonFungibleBalance(
    address: string,
    resourceAddress: string,
    stateVersion?: number
  ) {
    const response =
      await this.apiClient.state.innerClient.entityNonFungibleResourceVaultPage(
        {
          stateEntityNonFungibleResourceVaultsPageRequest: {
            address,
            resource_address: resourceAddress,
            at_ledger_state: RadixApiClient.makeLedgerState(stateVersion),
          },
        }
      );

    if (response.items.length !== 1) {
      return 0;
    }

    return response.items[0].total_count;
  }

  async getTransactions(
    fromStateVersion: number,
    atStateVersion: number,
    addresses: string[],
    cursor?: string | null
  ) {
    return await this.apiClient.stream.innerClient.streamTransactions({
      streamTransactionsRequest: {
        cursor,
        from_ledger_state: RadixApiClient.makeLedgerState(fromStateVersion),
        at_ledger_state: RadixApiClient.makeLedgerState(atStateVersion),
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
    const res = await this.apiClient.state.getEntityDetailsVaultAggregated(
      componentId,
      undefined,
      RadixApiClient.makeLedgerState(stateVersion)
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

  private static makeLedgerState(stateVersion?: number) {
    return stateVersion !== undefined
      ? ({ state_version: stateVersion } as LedgerStateSelector)
      : undefined;
  }
}
