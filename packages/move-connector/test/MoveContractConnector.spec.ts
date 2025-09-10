import {
  Account,
  Aptos,
  Network,
  PrivateKey,
  PrivateKeyVariants,
  Secp256k1PrivateKey,
} from "@aptos-labs/ts-sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { PRICE_ADAPTER } from "../scripts/contract-name-enum";
import { readObjectAddress } from "../scripts/deploy-utils";
import { makeAptos } from "../scripts/utils";
import { MoveClient, MovePricesContractAdapter, MovePricesContractConnector } from "../src";
import {
  FAKE_PRIVKEY_SECP256K1,
  NETWORK,
  REST_FAUCET_LOCALNET_URL,
  REST_NODE_LOCALNET_URL,
} from "./helpers";

const WAIT_MS = 5_000;

describe("MovePricesContractConnector", () => {
  let connector: MovePricesContractConnector;
  let aptos: Aptos;
  let account: Account;

  beforeAll(() => {
    aptos = makeAptos(NETWORK as Network, REST_NODE_LOCALNET_URL, REST_FAUCET_LOCALNET_URL);
    const { contractAddress: contractAddress, objectAddress } = readObjectAddress(
      PRICE_ADAPTER,
      NETWORK
    );
    account = Account.fromPrivateKey({
      privateKey: new Secp256k1PrivateKey(
        PrivateKey.formatPrivateKey(FAKE_PRIVKEY_SECP256K1, PrivateKeyVariants.Secp256k1)
      ),
    });
    const packageObjectAddress = contractAddress.toString();
    const priceAdapterObjectAddress = objectAddress!.toString();
    connector = new MovePricesContractConnector(
      new MoveClient(aptos),
      { packageObjectAddress, priceAdapterObjectAddress },
      account
    );
  });

  describe("getAdapter", () => {
    it("should return adapter", async () => {
      const adapter = await connector.getAdapter();
      expect(adapter).toBeInstanceOf(MovePricesContractAdapter);
    });
  });

  describe("getBlockNumber", () => {
    it("should get block number", async () => {
      const blockNumber = await connector.getBlockNumber();
      expect(blockNumber).toBeGreaterThan(0);
    });
  });

  describe("waitForTransaction", () => {
    it(
      "should wait for transaction",
      async () => {
        const alice = Account.generate();
        const bob = Account.generate();
        try {
          await aptos.fundAccount({
            accountAddress: alice.accountAddress,
            amount: 100_000_000,
          });
          await aptos.fundAccount({
            accountAddress: bob.accountAddress,
            amount: 100,
          });
        } catch (err) {
          expect(err).toBeDefined();
        } // It will fund with proper faucet REST_FAUCET_LOCAL_URL anyway, but for unknown reason throws error ECONNREFUSED 127.0.0.1:8090
        // Faucet is set to the proper endpoint.

        const transaction = await aptos.transaction.build.simple({
          sender: alice.accountAddress,
          data: {
            function: "0x1::aptos_account::transfer",
            functionArguments: [bob.accountAddress, 100],
          },
        });
        const senderAuthenticator = aptos.transaction.sign({
          signer: alice,
          transaction,
        });
        const submittedTransaction = await aptos.transaction.submit.simple({
          transaction,
          senderAuthenticator,
        });
        await RedstoneCommon.sleep(WAIT_MS);
        const result = await connector.waitForTransaction(submittedTransaction.hash);

        expect(result).toBeTruthy();
      },
      4 * WAIT_MS
    );
  });
});
