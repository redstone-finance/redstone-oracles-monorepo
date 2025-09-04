import { Address, Operation } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { StellarRpcClient } from "./StellarRpcClient";
import { StellarTxDeliveryMan } from "./StellarTxDeliveryMan";

export class StellarContractDeployer {
  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly txDeliveryMan: StellarTxDeliveryMan
  ) {}

  async deploy(wasmPath: string) {
    const wasmHash = await this.upload(wasmPath);
    const contractId = await this.createContract(wasmHash);

    return {
      wasmHash: wasmHash.toString("hex"),
      contractId: contractId.toString(),
    };
  }

  async upload(wasmPath: string) {
    const wasmBuffer = readFileSync(wasmPath);

    const hash = await this.txDeliveryMan.sendTransaction(() => {
      return Operation.uploadContractWasm({ wasm: wasmBuffer });
    });

    const res = await this.rpcClient.waitForTx(hash);

    return res.returnValue!.bytes();
  }

  async createContract(wasmHash: Buffer) {
    const address = Address.fromString(await this.txDeliveryMan.getPublicKey());

    const hash = await this.txDeliveryMan.sendTransaction(() => {
      return Operation.createCustomContract({ wasmHash, address });
    });

    const res = await this.rpcClient.waitForTx(hash);

    return Address.fromScVal(res.returnValue!);
  }
}
