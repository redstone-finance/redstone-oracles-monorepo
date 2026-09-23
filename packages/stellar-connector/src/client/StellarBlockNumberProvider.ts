import { RedstoneCommon } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";

export class StellarBlockNumberProvider extends RedstoneCommon.BlockNumberProvider {
  constructor(private readonly server: rpc.Server) {
    super();
  }

  protected override async fetchBlockNumber() {
    return (await this.server.getLatestLedger()).sequence;
  }
}
