import { Address, Keypair, Operation, rpc } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { StellarRpcClient } from "./StellarRpcClient";

export class ContractDeployer {
  private readonly rpcClient: StellarRpcClient;

  constructor(
    private readonly rpc: rpc.Server,
    private readonly keypair: Keypair
  ) {
    this.rpcClient = new StellarRpcClient(rpc);
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

    const uploadOperation = Operation.uploadContractWasm({ wasm: wasmBuffer });
    const submitionResult = await this.rpcClient.executeOperation(
      uploadOperation,
      this.keypair
    );
    const res = await this.rpcClient.waitForTx(submitionResult.hash);

    return res.returnValue!.bytes();
  }

  async createContract(wasmHash: Buffer) {
    const address = Address.fromString(this.keypair.publicKey());

    const createOperation = Operation.createCustomContract({
      wasmHash,
      address,
    });

    const submitionResult = await this.rpcClient.executeOperation(
      createOperation,
      this.keypair
    );
    const res = await this.rpcClient.waitForTx(submitionResult.hash);

    return Address.fromScVal(res.returnValue!);
  }
}
