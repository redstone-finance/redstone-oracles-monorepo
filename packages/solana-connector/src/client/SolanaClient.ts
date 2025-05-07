import { web3 } from "@coral-xyz/anchor";
import { RedstoneCommon } from "@redstone-finance/utils";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";

export class SolanaClient {
  constructor(private readonly connection: Connection) {}

  async getAccountInfo<T>(
    address: PublicKey,
    decoder: (buffer: AccountInfo<Buffer>) => T,
    slot: number | undefined,
    description?: string
  ) {
    const slotData = await this.waitForSlot(slot, description);
    const response = await this.connection.getAccountInfo(address, slotData);

    if (!response) {
      throw new Error(`Could not fetch data for account ${address.toBase58()}`);
    }

    return decoder(response);
  }

  async getMultipleAccountsInfo<T>(
    accounts: PublicKey[],
    singleAccountDecoder: (buffer: AccountInfo<Buffer>) => T,
    description: string,
    slot?: number
  ) {
    const slotData = await this.waitForSlot(slot, description);

    const response = await this.connection.getMultipleAccountsInfo(accounts, {
      ...slotData,
    });

    return response.map((value) => {
      if (!value) {
        return undefined;
      }

      return singleAccountDecoder(value);
    });
  }

  async viewMethod<T>(
    method: { view: (options?: web3.ConfirmOptions) => Promise<unknown> },
    slot?: number,
    description?: string
  ) {
    const slotData = await this.waitForSlot(slot, description);

    return (await method.view(slotData)) as T;
  }

  private async waitForSlot(slot?: number, description?: string) {
    if (!slot) {
      return;
    }

    await RedstoneCommon.waitForBlockNumber(
      () => this.connection.getSlot(),
      slot,
      `${description ?? ""} in slot ${slot}`
    );

    return { minContextSlot: slot };
  }
}
