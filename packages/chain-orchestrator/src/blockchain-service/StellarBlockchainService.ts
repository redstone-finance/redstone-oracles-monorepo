import {
  StellarContractConnector,
  StellarRpcClient,
} from "@redstone-finance/stellar-connector";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

export class StellarBlockchainService extends NonEvmBlockchainService {
  constructor(client: StellarRpcClient) {
    super(new StellarContractConnector(client));
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  getTimeForBlock(_blockHeight: number) {
    console.warn("getTimeForBlock is not supported for Stellar");
    return Promise.resolve(new Date(0));
  }
}
