import { BASE_FEE, Contract, xdr } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "./stellar/StellarRpcClient";
import * as XdrUtils from "./XdrUtils";

const TIMEOUT_SEC = 3600;

export class AdminAdapter {
  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly contract: Contract
  ) {}

  async changeAdminTx(sender: string, newAdmin: string, timeout = TIMEOUT_SEC) {
    const adminAddr = XdrUtils.addressToScVal(newAdmin);

    return await this.rpcClient.transactionFromOperation(
      this.contract.call("change_admin", adminAddr),
      sender,
      BASE_FEE,
      timeout
    );
  }

  async upgrade(sender: string, codeHash: string, timeout = TIMEOUT_SEC) {
    const codeHashXdr = xdr.ScVal.scvBytes(Buffer.from(codeHash, "hex"));

    return await this.rpcClient.transactionFromOperation(
      this.contract.call("upgrade", codeHashXdr),
      sender,
      BASE_FEE,
      timeout
    );
  }
}
