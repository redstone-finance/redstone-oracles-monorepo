import { JsonRpcProvider } from "@ethersproject/providers";
import { isEvmNetworkId, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import { randomUUID } from "crypto";
import { providers, Signer, Transaction } from "ethers";
import { parseTransaction } from "ethers/lib/utils";
import { RelayerConfig } from "../../config/RelayerConfig";
import { RedstoneEvmContract } from "../../facade/evm/EvmContractFacade";

const logger = loggerFactory("update-using-oev-auction");

export const updateUsingOevAuction = async (
  relayerConfig: RelayerConfig,
  txDeliveryCalldata: string,
  adapterContract: RedstoneEvmContract
) => {
  logger.log(`Updating using OEV auction`);
  const start = Date.now();
  const auctionResponse = await runOevAuction(
    relayerConfig,
    adapterContract.signer,
    txDeliveryCalldata
  );
  const auctionFinished = Date.now();
  logger.info(
    `OEV auction finished in ${auctionFinished - start}ms with response`,
    auctionResponse
  );

  const { id, error, result } = auctionResponse;
  if (result) {
    logger.info(`Received signed oev id: ${id}, transactions count: ${result.length}`);
  } else {
    if (error?.message?.includes("no solver operations received")) {
      throw new Error(`No solver operations received`);
    } else {
      throw new Error(`Unexpected behaviour ${JSON.stringify(error)}`);
    }
  }

  const verificationTimeout =
    relayerConfig.oevAuctionVerificationTimeout ?? 1.5 * relayerConfig.getBlockNumberTimeout;

  const verificationPromises = result.map((tx) =>
    verifyFastlaneResponse(adapterContract.provider as providers.JsonRpcProvider, tx, relayerConfig)
  );

  await RedstoneCommon.timeout(
    Promise.any(verificationPromises),
    verificationTimeout,
    `Verification of the OEV auction didn't finish in ${verificationTimeout} [ms].`
  );

  const finish = Date.now();
  logger.log(
    `OEV auction successfully completed in ${finish - start}ms, verification took ${finish - auctionFinished}ms`
  );
};

type OevAuctionResponse = {
  jsonrpc: string;
  id: number;
  result?: string[];
  error?: {
    code?: number;
    message?: string;
  };
};

const runOevAuction = async (
  relayerConfig: RelayerConfig,
  signer: Signer,
  txDeliveryCalldata: string
) => {
  const oevAuctionUrl = relayerConfig.oevAuctionUrl!;
  const { adapterContractAddress, networkId } = relayerConfig;
  if (!isEvmNetworkId(networkId)) {
    throw new Error("Non-evm networkId is not supported in fastlane.");
  }

  const chainIdHex = `0x${networkId.toString(16)}`;
  const earlyReturn = true;
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "atlas_redstoneAuction",
    params: [
      {
        adapter: adapterContractAddress,
        updatePayload: txDeliveryCalldata,
        signature: await signer.signMessage(
          `${chainIdHex}:${adapterContractAddress}:${txDeliveryCalldata}:${earlyReturn}`
        ),
        earlyReturn: earlyReturn,
        chainId: chainIdHex,
      },
    ],
  });
  try {
    const response = await axios.post<OevAuctionResponse>(oevAuctionUrl, body, {
      timeout: relayerConfig.oevResolveAuctionTimeout,
    });
    return response.data;
  } catch (error) {
    logOevAuctionError(error);
    throw new Error(`OEV auction failed: ${RedstoneCommon.stringifyError(error)}`);
  }
};

const verifyFastlaneResponse = async (
  provider: JsonRpcProvider,
  tx: string,
  relayerConfig: RelayerConfig
) => {
  const decodedTx = parseTransaction(tx);
  logger.log(`Decoded transaction from FastLane: ${JSON.stringify(decodedTx)}`);
  void tryToPropagateTransaction(provider, tx);
  const waitForTransactionToMintPromise = waitForTransactionMint(provider, decodedTx).catch(
    (error) => {
      logger.log(`Failed to wait for transaction mint: ${RedstoneCommon.stringifyError(error)}`);
      throw error;
    }
  );
  const checkGasPricePromise = verifyGasPrice(relayerConfig, provider, decodedTx).catch((error) => {
    logger.log(`Failed to verify gas price: ${RedstoneCommon.stringifyError(error)}`);
    throw error;
  });
  await Promise.all([waitForTransactionToMintPromise, checkGasPricePromise]);
};

const tryToPropagateTransaction = async (provider: providers.JsonRpcProvider, tx: string) => {
  try {
    await provider.sendTransaction(tx);
  } catch (e) {
    logger.log(
      `Unable to propagate, but FastLane likely already did, ${RedstoneCommon.stringifyError(e)}`
    );
  }
};

const waitForTransactionMint = async (
  provider: providers.JsonRpcProvider,
  decodedTx: Transaction
) => {
  const start = Date.now();
  logger.log(`Waiting for transaction with oev to mint`);
  const receipt = await provider.waitForTransaction(decodedTx.hash!);
  if (receipt.status !== 1) {
    throw new Error(`Fastlane transaction failed after ${Date.now() - start}`);
  } else {
    logger.log(`OEV transaction: ${decodedTx.hash} minted, took: ${Date.now() - start}ms`);
  }
};

const verifyGasPrice = async (
  relayerConfig: RelayerConfig,
  provider: JsonRpcProvider,
  decodedTx: Transaction
): Promise<void> => {
  if (relayerConfig.oevVerifyGasPriceDisabled) {
    return await Promise.resolve();
  } else {
    const gasPrice = await provider.getGasPrice();
    logger.log(
      `Max fee per gas in FastLane transaction: ${decodedTx.maxFeePerGas!.toString()}, current estimated gas price: ${gasPrice.toString()}`
    );
    if (gasPrice.gt(decodedTx.maxFeePerGas!)) {
      throw new Error("FastLane transaction gasPrice too low");
    }
  }
};

const logOevAuctionError = (error: unknown) => {
  if (
    axios.isAxiosError<{ error: { code: number } }>(error) &&
    error.response?.data.error.code === -32600
  ) {
    logger.log("No bids in OEV auction");
  } else {
    logger.error(`OEV auction failed with unknown error: ${RedstoneCommon.stringifyError(error)}`);
  }
};
