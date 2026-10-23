import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { MultiExecutor } from "@redstone-finance/utils";
import { LegacySuiTxLookup } from "./lookup/LegacySuiTxLookup";
import { SUB_INSTANCE_MODES, SuiClient } from "./SuiClient";

const MISSING_FIELD_CODES = ["notExists", "dynamicFieldNotFound", "deleted"];

export class LegacySuiClient extends SuiClient {
  private readonly batchingClient: SuiJsonRpcClient;

  constructor(private readonly client: SuiJsonRpcClient) {
    super(client.core);

    this.batchingClient = this.objects.wrapClient(client);
  }

  get clientWithCoreApi() {
    return MultiExecutor.createForSubInstances(this, (c: LegacySuiClient) => c.batchingClient, {
      ...SUB_INSTANCE_MODES,
      getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
    });
  }

  get txLookup() {
    return new LegacySuiTxLookup(this.client);
  }

  protected override isMissingFieldError(error: unknown) {
    return (
      error instanceof Error &&
      LegacySuiClient.hasErrorCode(error) &&
      MISSING_FIELD_CODES.includes(error.code)
    );
  }

  async getBlockNumber() {
    return Number(await this.client.getLatestCheckpointSequenceNumber());
  }

  protected async fetchReferenceGasPrice() {
    return await this.client.getReferenceGasPrice();
  }

  async getTimeForBlock(block: number) {
    const checkpoint = await this.client.getCheckpoint({
      id: String(block),
    });

    return new Date(Number(checkpoint.timestampMs));
  }
}
