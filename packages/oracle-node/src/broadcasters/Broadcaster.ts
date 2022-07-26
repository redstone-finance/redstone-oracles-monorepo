import { SignedDataPackagePlainObj } from "redstone-protocol";

export interface Broadcaster {
  broadcast(prices: SignedDataPackagePlainObj[]): Promise<void>;

  broadcastPricePackage(signedData: SignedDataPackagePlainObj): Promise<void>;
}
