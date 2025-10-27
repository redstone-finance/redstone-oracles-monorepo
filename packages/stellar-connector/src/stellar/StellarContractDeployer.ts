import { Address, Operation } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { StellarClient } from "./StellarClient";
import { StellarOperationSender } from "./StellarOperationSender";

export class StellarContractDeployer {
  constructor(
    private readonly client: StellarClient,
    private readonly operationSender: StellarOperationSender
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

    const hash = await this.operationSender.sendTransaction(
      Operation.uploadContractWasm({ wasm: wasmBuffer })
    );

    return (await this.client.getTransaction(hash, (returnValue) => returnValue.bytes())).value!;
  }

  async createContract(wasmHash: Buffer) {
    const address = Address.fromString(await this.operationSender.getPublicKey());

    const hash = await this.operationSender.sendTransaction(
      Operation.createCustomContract({ wasmHash, address })
    );

    return (await this.client.getTransaction(hash, Address.fromScVal)).value!;
  }
}
