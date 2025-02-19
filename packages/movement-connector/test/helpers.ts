import {
  Account,
  Aptos,
  Network,
  PrivateKey,
  PrivateKeyVariants,
  Secp256k1PrivateKey,
} from "@aptos-labs/ts-sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  deploy,
  PRICE_ADAPTER,
  readDepAddresses,
  REDSTONE_SDK,
} from "../scripts/deploy-utils";
import { makeAptos } from "../scripts/utils";
import { OCTAS_PER_MOVE } from "../src/consts";

const COINS_FOR_TESTS = 10 * OCTAS_PER_MOVE;
export const FAKE_PRIVKEY_SECP256K1 =
  "0xd53edc737401d6abaa44e6a17f4e33c5a29deb6bbaac7fa6cbd3bebe83d9e081";
export const REST_NODE_LOCALNET_URL = "http://127.0.0.1:8080/v1";
export const REST_FAUCET_LOCALNET_URL = "http://127.0.0.1:8081";
export const NETWORK = "local";

export class TestHelper {
  private isPrepared = false;
  private readonly logger = loggerFactory(
    "movement-prices-contract-connector-tests"
  );

  static makeLocal(): TestHelper {
    const client = makeAptos(NETWORK as Network, REST_NODE_LOCALNET_URL);
    const account = Account.fromPrivateKey({
      privateKey: new Secp256k1PrivateKey(
        PrivateKey.formatPrivateKey(
          FAKE_PRIVKEY_SECP256K1,
          PrivateKeyVariants.Secp256k1
        )
      ),
    });

    return new TestHelper(client, account);
  }

  constructor(
    private readonly client: Aptos,
    private readonly account: Account
  ) {}

  private async foundAccount() {
    try {
      const transaction = await this.client.fundAccount({
        accountAddress: this.account.accountAddress,
        amount: COINS_FOR_TESTS,
      });

      const result = await this.client.waitForTransaction({
        transactionHash: transaction.hash,
      });
      if (result.success) {
        this.logger.info("Funds transferred.");
      }
    } catch (e) {
      this.logger.info(
        `Failed when founding account for tests ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  async prepare() {
    if (this.isPrepared) {
      return;
    }
    this.isPrepared = true;
    await this.foundAccount();
    await RedstoneCommon.sleep(1000);
    await deploy(this.client, this.account, REDSTONE_SDK, NETWORK);
    await RedstoneCommon.sleep(1000);
    await deploy(
      this.client,
      this.account,
      PRICE_ADAPTER,
      NETWORK,
      readDepAddresses([REDSTONE_SDK], NETWORK)
    );
  }
}
