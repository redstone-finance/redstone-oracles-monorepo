import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { SolanaClient } from "../client/SolanaClient";
import { SolanaContractUpdater } from "../client/SolanaContractUpdater";
import { SolanaContractAdapter } from "./SolanaPricesContractAdapter";

export class SolanaWriteContractAdapter
  extends SolanaContractAdapter
  implements WriteContractAdapter
{
  constructor(
    client: SolanaClient,
    private readonly updater: SolanaContractUpdater
  ) {
    super(updater.getContract(), client);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    const res = await this.updater.writePrices(paramsProvider);

    return FP.unwrapSuccess(FP.mapErr(res, (errors) => new AggregateError(errors))).transactionHash;
  }

  async transfer(toAddress: string, amountInSol: number) {
    return await this.client.transfer(this.updater.getKeypair(), toAddress, amountInSol);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.updater.getPublicKey().toBase58());
  }
}
