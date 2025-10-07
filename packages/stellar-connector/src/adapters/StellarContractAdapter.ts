import { BASE_FEE, Contract, xdr } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { StellarTxDeliveryMan } from "../stellar/StellarTxDeliveryMan";
import * as XdrUtils from "../XdrUtils";

const TIMEOUT_SEC = 3600;

export class StellarContractAdapter {
  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract,
    protected readonly txDeliveryMan?: StellarTxDeliveryMan
  ) {}

  async getPublicKey() {
    const pk = await this.txDeliveryMan?.getPublicKey();
    if (pk === undefined) {
      throw new Error("txDeliveryMan not set");
    }
    return pk;
  }

  protected async initContract(owner: string, ...otherParams: xdr.ScVal[]) {
    if (!this.txDeliveryMan) {
      throw new Error("Cannot initialize contract, txDeliveryMan not set");
    }

    const ownerAddr = XdrUtils.addressToScVal(owner);

    return await this.txDeliveryMan.sendTransaction(() => {
      return this.contract.call("init", ownerAddr, ...otherParams);
    });
  }

  async changeOwnerTx(sender: string, newOwner: string, timeout = TIMEOUT_SEC, fee = BASE_FEE) {
    const ownerAddr = XdrUtils.addressToScVal(newOwner);

    return await this.client.buildTransaction(
      this.contract.call("change_owner", ownerAddr),
      sender,
      fee,
      timeout
    );
  }

  async upgradeTx(sender: string, codeHash: Buffer, timeout = TIMEOUT_SEC, fee = BASE_FEE) {
    const codeHashXdr = XdrUtils.bytesToScVal(codeHash);

    return await this.client.buildTransaction(
      this.contract.call("upgrade", codeHashXdr),
      sender,
      fee,
      timeout
    );
  }

  async changeOwner(newOwner: string) {
    if (!this.txDeliveryMan) {
      throw new Error("Cannot change contract's owner, txDeliveryMan not set");
    }

    const ownerAddr = XdrUtils.addressToScVal(newOwner);

    return await this.txDeliveryMan.sendTransaction(() => {
      return this.contract.call("change_owner", ownerAddr);
    });
  }

  async upgrade(wasmHash: Buffer) {
    if (!this.txDeliveryMan) {
      throw new Error("Cannot upgrade contract, txDeliveryMan not set");
    }

    const hash = XdrUtils.bytesToScVal(wasmHash);

    return await this.txDeliveryMan.sendTransaction(() => {
      return this.contract.call("upgrade", hash);
    });
  }
}
