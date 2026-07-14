import { Address, Operation, xdr } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { StellarClient } from "../client/StellarClient";
import { StellarOperationSender } from "../tx/StellarOperationSender";

export class StellarContractDeployer {
  constructor(
    private readonly client: StellarClient,
    private readonly operationSender: StellarOperationSender
  ) {}

  async deploy(wasmPath: string, constructorArgs?: xdr.ScVal[]) {
    const wasmHash = await this.upload(wasmPath);
    const contractId = await this.createContract(wasmHash, constructorArgs);

    return {
      wasmHash: wasmHash.toString("hex"),
      contractId: contractId.toString(),
    };
  }

  async upload(wasmPath: string) {
    const wasmBuffer = readFileSync(wasmPath);

    const hash = await this.operationSender.sendTransaction(
      Operation.uploadContractWasm({ wasm: wasmBuffer })
    );

    const { value } = await this.client.getTransaction(hash, (returnValue) => returnValue.bytes());
    if (!value) {
      throw new Error(`Upload transaction ${hash} returned no wasm hash`);
    }

    return value;
  }

  async createContract(wasmHash: Buffer, constructorArgs?: xdr.ScVal[]) {
    const address = Address.fromString(await this.operationSender.getPublicKey());

    const hash = await this.operationSender.sendTransaction(
      Operation.createCustomContract({ wasmHash, address, constructorArgs })
    );

    const { value } = await this.client.getTransaction(hash, Address.fromScVal);
    if (!value) {
      throw new Error(`Create-contract transaction ${hash} returned no contract id`);
    }

    return value;
  }
}
