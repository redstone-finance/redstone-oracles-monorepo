import { BlockchainService } from "./BlockchainService";

export interface BlockchainServiceWithTransfer extends BlockchainService {
  transfer(toAddress: string, amount: number): Promise<void>;
  getSignerAddress(): Promise<string>;
}
