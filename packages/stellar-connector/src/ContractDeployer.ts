import { Address, Keypair, Operation, rpc } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { StellarRpcClient } from "./StellarRpcClient";

export class ContractDeployer {
  private readonly rpcClient: StellarRpcClient;

  constructor(
    rpc: rpc.Server,
    private readonly keypair: Keypair,
    private readonly wasmPath: string
  ) {
    this.rpcClient = new StellarRpcClient(rpc);
  }

  async deploy() {
    const wasmHash = await this.upload();
    const contractId = await this.createContract(wasmHash);

    return {
      wasmHash: wasmHash.toString("hex"),
      contractId: contractId.toString(),
    };
  }

  async upload() {
    const wasmBuffer = readFileSync(this.wasmPath);

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
