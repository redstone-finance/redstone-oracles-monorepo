import { Address, Keypair, Operation } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { StellarRpcClient } from "./stellar/StellarRpcClient";

export class StellarContractDeployer {
  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly keypair: Keypair
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

    const uploadOperation = Operation.uploadContractWasm({ wasm: wasmBuffer });
    const submissionResult = await this.rpcClient.executeOperation(
      uploadOperation,
      this.keypair
    );
    const res = await this.rpcClient.waitForTx(submissionResult.hash);

    return res.returnValue!.bytes();
  }

  async createContract(wasmHash: Buffer) {
    const address = Address.fromString(this.keypair.publicKey());

    const createOperation = Operation.createCustomContract({
      wasmHash,
      address,
    });

    const submissionResult = await this.rpcClient.executeOperation(
      createOperation,
      this.keypair
    );
    const res = await this.rpcClient.waitForTx(submissionResult.hash);

    return Address.fromScVal(res.returnValue!);
  }
}
