import { BASE_FEE, Contract, xdr } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { StellarOperation, StellarOperationSender } from "../stellar/StellarOperationSender";
import * as XdrUtils from "../XdrUtils";

const TIMEOUT_SEC = 3600;

const FN_INIT = "init";
const FN_CHANGE_OWNER = "change_owner";
const FN_ACCEPT_OWNERSHIP = "accept_ownership";
const FN_CANCEL_OWNERSHIP_TRANSFER = "cancel_ownership_transfer";
const FN_UPGRADE = "upgrade";

export class StellarContractAdapter {
  constructor(
    protected readonly client: StellarClient,
    protected readonly contract: Contract,
    protected readonly operationSender?: StellarOperationSender
  ) {}

  async getPublicKey() {
    const pk = await this.operationSender?.getPublicKey();

    if (pk === undefined) {
      throw new Error("txDeliveryMan not set");
    }

    return pk;
  }

  protected async initContract(owner: string, ...otherParams: xdr.ScVal[]) {
    if (!this.operationSender) {
      throw new Error("Cannot initialize contract, ContractWriter not set");
    }

    const ownerAddr = XdrUtils.addressToScVal(owner);

    return await this.operationSender.sendTransaction(
      this.contract.call(FN_INIT, ownerAddr, ...otherParams)
    );
  }

  async changeOwnerTx(sender: string, newOwner: string, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    const ownerAddr = XdrUtils.addressToScVal(newOwner);

    return await this.client.prepareTransaction(
      this.contract.call(FN_CHANGE_OWNER, ownerAddr),
      sender,
      fee,
      timeout
    );
  }

  async acceptOwnershipTx(sender: string, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    return await this.client.prepareTransaction(
      this.contract.call(FN_ACCEPT_OWNERSHIP),
      sender,
      fee,
      timeout
    );
  }

  async cancelOwnershipTransferTx(sender: string, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    return await this.client.prepareTransaction(
      this.contract.call(FN_CANCEL_OWNERSHIP_TRANSFER),
      sender,
      fee,
      timeout
    );
  }

  async upgradeTx(sender: string, codeHash: Buffer, fee = BASE_FEE, timeout = TIMEOUT_SEC) {
    const codeHashXdr = XdrUtils.bytesToScVal(codeHash);

    return await this.client.prepareTransaction(
      this.contract.call(FN_UPGRADE, codeHashXdr),
      sender,
      fee,
      timeout
    );
  }

  async changeOwner(newOwner: string) {
    if (!this.operationSender) {
      throw new Error("Cannot change contract's owner, ContractWriter not set");
    }

    const ownerAddr = XdrUtils.addressToScVal(newOwner);

    return await this.operationSender.sendTransaction(
      this.contract.call(FN_CHANGE_OWNER, ownerAddr)
    );
  }

  async upgrade(wasmHash: Buffer) {
    if (!this.operationSender) {
      throw new Error("Cannot upgrade contract, ContractWriter not set");
    }

    const hash = XdrUtils.bytesToScVal(wasmHash);

    return await this.operationSender.sendTransaction(this.contract.call(FN_UPGRADE, hash));
  }

  async acceptOwnership() {
    if (!this.operationSender) {
      throw new Error("Cannot accept ownership, ContractWriter not set");
    }

    return await this.operationSender.sendTransaction(this.contract.call(FN_ACCEPT_OWNERSHIP));
  }

  async cancelOwnershipTransfer() {
    if (!this.operationSender) {
      throw new Error("Cannot cancel ownership transfer, ContractWriter not set");
    }

    return await this.operationSender.sendTransaction(
      this.contract.call(FN_CANCEL_OWNERSHIP_TRANSFER)
    );
  }

  async extendInstanceTtl() {
    if (!this.operationSender) {
      throw new Error("Cannot extend instance TTL, ContractWriter not set");
    }

    const operation = this.getExtendInstanceTtlOperation();
    await this.operationSender.sendTransaction(operation);

    return await this.client.getInstanceTtl(this.contract);
  }

  // A function containing extend_ttl in its body
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- will be implemented in a subclass
  protected getExtendInstanceTtlOperation(): StellarOperation {
    throw new Error("Method not implemented: getExtendInstanceTtlOperation");
  }
}
