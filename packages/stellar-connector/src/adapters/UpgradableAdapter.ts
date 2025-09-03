import { BASE_FEE, Contract } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import * as XdrUtils from "../XdrUtils";

const TIMEOUT_SEC = 3600;

export class UpgradableAdapter {
  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly contract: Contract
  ) {}

  async changeOwnerTx(sender: string, newOwner: string, timeout = TIMEOUT_SEC) {
    const ownerAddr = XdrUtils.addressToScVal(newOwner);

    return await this.rpcClient.transactionFromOperation(
      this.contract.call("change_owner", ownerAddr),
      sender,
      BASE_FEE,
      timeout
    );
  }

  async upgrade(sender: string, codeHash: string, timeout = TIMEOUT_SEC) {
    const codeHashXdr = XdrUtils.bytesToScVal(Buffer.from(codeHash, "hex"));

    return await this.rpcClient.transactionFromOperation(
      this.contract.call("upgrade", codeHashXdr),
      sender,
      BASE_FEE,
      timeout
    );
  }
}
