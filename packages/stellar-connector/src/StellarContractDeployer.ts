import { Address, Keypair, Operation } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { DEFAULT_STELLAR_CONFIG } from "./config";
import { StellarRpcClient } from "./stellar/StellarRpcClient";
import { StellarTxDeliveryMan } from "./stellar/StellarTxDeliveryMan";

export class StellarContractDeployer {
  private readonly txDeliveryMan: StellarTxDeliveryMan;

  constructor(
    private readonly rpcClient: StellarRpcClient,
    keypair: Keypair,
    config = DEFAULT_STELLAR_CONFIG
  ) {
    this.txDeliveryMan = new StellarTxDeliveryMan(
      rpcClient,
      keypair,
      config.txDeliveryMan
    );
  }

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
    const address = Address.fromString(this.txDeliveryMan.getPublicKey());

    const hash = await this.txDeliveryMan.sendTransaction(() => {
      return Operation.createCustomContract({ wasmHash, address });
    });

    const res = await this.rpcClient.waitForTx(hash);

    return Address.fromScVal(res.returnValue!);
  }
}
