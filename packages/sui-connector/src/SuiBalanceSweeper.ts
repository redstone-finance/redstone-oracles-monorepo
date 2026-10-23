import type { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { signExecuteAndWait } from "./client/sign-execute-and-wait";
import type { SuiClient } from "./client/SuiClient";
import { SEND_FUNDS_TARGET } from "./util";

const SWEEP_INTERVAL_MS = RedstoneCommon.minToMs(10);
const SWEEP_TX_GAS_BUDGET = MIST_PER_SUI / 100n;
const MAX_GAS_PAYMENT_OBJECTS = 250;

export class SuiBalanceSweeper {
  protected readonly logger = loggerFactory("sui-balance-sweeper");
  private timer?: NodeJS.Timeout;
  private isSweeping = false;

  constructor(
    private readonly client: SuiClient,
    private readonly keypair: Keypair,
    private readonly intervalMs = SWEEP_INTERVAL_MS
  ) {}

  start() {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => void this.sweep(), this.intervalMs);
    this.timer.unref();
    void this.sweep();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async sweep() {
    if (this.isSweeping) {
      return;
    }
    this.isSweeping = true;
    try {
      await this.sweepCoins();
    } catch (e) {
      this.logger.warn(`Failed to sweep coins: ${RedstoneCommon.stringifyError(e)}`);
    } finally {
      this.isSweeping = false;
    }
  }

  private async sweepCoins() {
    const address = this.keypair.toSuiAddress();
    const { objects } = await this.client.listCoins({ owner: address, coinType: SUI_TYPE_ARG });
    const coins = objects.slice(0, MAX_GAS_PAYMENT_OBJECTS);
    const total = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    const amount = total - SWEEP_TX_GAS_BUDGET;

    if (amount <= 0n) {
      return;
    }

    this.logger.log(
      `Sweeping ${amount} MIST from ${RedstoneCommon.getNS(coins.length, "coin")} into the address balance`
    );

    const tx = new Transaction();
    tx.setSender(address);
    tx.setGasBudget(SWEEP_TX_GAS_BUDGET);
    tx.setGasPayment(coins.map(({ objectId, version, digest }) => ({ objectId, version, digest })));
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
    tx.moveCall({
      target: SEND_FUNDS_TARGET,
      typeArguments: [SUI_TYPE_ARG],
      arguments: [coin, tx.pure.address(address)],
    });

    const { digest } = await signExecuteAndWait(this.client, tx, this.keypair);

    this.logger.log(`Swept coins into the address balance in ${digest}`);
  }
}
