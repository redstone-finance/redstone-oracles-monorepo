import { FallbackMultiTxDeliveryMan } from "@redstone-finance/multichain-kit";
import { Keypair } from "@solana/web3.js";
import { AnchorReadonlyProvider } from "../client/AnchorReadonlyProvider";
import { JitoBundleClient } from "../client/JitoBundleClient";
import { JitoBundleSender } from "../client/JitoBundleSender";
import { RpcSender } from "../client/RpcSender";
import { SolanaClient } from "../client/SolanaClient";
import { SolanaContractUpdater } from "../client/SolanaContractUpdater";
import { DEFAULT_SOLANA_CONFIG, SolanaConfig } from "../config";
import { PriceAdapterContract } from "./PriceAdapterContract";

export function makeSolanaUpdater(
  { client, jito }: { client: SolanaClient; jito?: JitoBundleClient },
  adapterContractAddress: string,
  keypair: Keypair,
  config: SolanaConfig = DEFAULT_SOLANA_CONFIG
) {
  const provider = new AnchorReadonlyProvider(client, keypair.publicKey);
  const contract = new PriceAdapterContract(adapterContractAddress, provider, client);
  const mainUpdater = new SolanaContractUpdater(
    client,
    config,
    keypair,
    contract,
    new RpcSender(client)
  );

  if (config.canSendViaJito && jito) {
    const sender = new JitoBundleSender(jito, keypair);

    return new SolanaContractUpdater(
      client,
      config,
      keypair,
      contract,
      sender,
      makeAlternativeDeliveryMan(mainUpdater, sender.maxFeeds, config)
    );
  }

  return mainUpdater;
}

export function makeAlternativeDeliveryMan(
  mainUpdater: SolanaContractUpdater,
  maxFeeds: number,
  config: SolanaConfig
) {
  return new FallbackMultiTxDeliveryMan(
    {
      expectedTxDeliveryTimeInMs: config.expectedTxDeliveryTimeMs,
      maxTxSendAttempts: config.alternativeSenderMaxAttempts,
      batchSizePerRequestParams: () => maxFeeds,
    },
    mainUpdater,
    "alternative-solana-contract-tx-delivery-man"
  );
}
