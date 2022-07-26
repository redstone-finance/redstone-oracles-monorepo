import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Consola } from "consola";
import ArweaveMultihost from "arweave-multihost";
import {
  SmartWeave,
  SmartWeaveNodeFactory,
  LoggerFactory,
  SourceType,
  MemCache,
  RedstoneGatewayContractDefinitionLoader,
  RedstoneGatewayInteractionsLoader,
} from "redstone-smartweave";
import BundlrProxy from "./BundlrProxy";

const logger = require("../utils/logger")("utils/arweave-proxy") as Consola;

const REDSTONE_GATEWAY = "https://gateway.redstone.finance";

// This is a low-level "DAO" that allows to interact with Arweave blockchain
export default class ArweaveProxy {
  jwk: JWKInterface;
  arweave: Arweave;
  smartweave: SmartWeave;
  bundlr: BundlrProxy;

  constructor(jwk: JWKInterface) {
    this.jwk = jwk;
    this.arweave = ArweaveMultihost.initWithDefaultHosts({
      timeout: 60000, // Network request timeouts in milliseconds
      logging: true, // Enable network request logging
      logger: logger.info,
      onError: (...args: any) => {
        logger.warn("Arweave request failed", ...args);
      },
    });
    this.bundlr = new BundlrProxy(jwk);

    LoggerFactory.INST.setOptions({
      type: "json",
      displayFilePath: "hidden",
      displayInstanceName: false,
      minLevel: "info",
    });

    const redstoneInteractionsLoader = new RedstoneGatewayInteractionsLoader(
      REDSTONE_GATEWAY,
      undefined,
      SourceType.ARWEAVE
    );
    const redstoneContractDefinitionLoader =
      new RedstoneGatewayContractDefinitionLoader(
        REDSTONE_GATEWAY,
        this.arweave,
        new MemCache()
      );

    this.smartweave = SmartWeaveNodeFactory.memCachedBased(this.arweave, 1)
      .setInteractionsLoader(redstoneInteractionsLoader)
      .setDefinitionLoader(redstoneContractDefinitionLoader)
      .build();
  }

  async getAddress(): Promise<string> {
    return await this.arweave.wallets.jwkToAddress(this.jwk);
  }

  async getBalance(): Promise<number> {
    const address = await this.getAddress();
    const rawBalance = await this.arweave.wallets.getBalance(address);
    return parseFloat(this.arweave.ar.winstonToAr(rawBalance));
  }
}
