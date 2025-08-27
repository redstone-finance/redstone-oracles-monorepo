import {
  calculateBuffersHash,
  calculateDirectoryHash,
  terminateWithRemoteConfigError,
} from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { ethers } from "ethers";
import { scheduleJob } from "node-schedule";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import * as path from "node:path";
import { BACKUP_UPDATE_HASH, ConfigHistory } from "./ConfigHistory";
import { findDirOrThrow } from "./remote-config";

const logger = loggerFactory("ConfigUpdater");

export const HISTORICAL_CONFIG_DIR_PREFIX = "./config_";
export const BACKUP_CONFIG_DIR = "./config_backup";

export interface FileData {
  filePath: string;
  content: Buffer;
}

export type ConfigData = {
  configuration: FileData[];
  signatures: FileData[];
};

export interface IRemoteConfigLoader {
  load(): Promise<ConfigData>;
  currentUpdateHash(): Promise<string>;
}

export type ConfigUpdaterSignatures = {
  required: boolean;
  trustedAddresses: Set<string>;
  minRequiredSignatures: number;
};

export class ConfigUpdater extends EventEmitter {
  private currentUpdateHash: string | null = null;
  readonly history = new ConfigHistory();

  constructor(
    private readonly timestampMillisecondsInterval: number,
    private readonly configLoader: IRemoteConfigLoader,
    private readonly signatures: ConfigUpdaterSignatures,
    private readonly configBasePath: string,
    private readonly backupConfigSourceFolder: string
  ) {
    super();
    if (
      signatures.required &&
      signatures.trustedAddresses.size < signatures.minRequiredSignatures
    ) {
      throw new Error(
        `Required at least ${signatures.minRequiredSignatures} trusted signers configured in TRUSTED_REMOTE_CONFIG_SIGNERS env variable`
      );
    }
    this.history.add({
      configHash: this.prepareBackupConfig(),
      updateHash: BACKUP_UPDATE_HASH,
      blacklisted: false,
    });
  }

  async start() {
    const checkConfigUpdatedFn = async () => {
      logger.info(`${ConfigUpdater.name} run`);
      try {
        const newUpdateHash = await this.configLoader.currentUpdateHash();
        if (this.history.isUpdateHashBlacklisted(newUpdateHash)) {
          logger.warn(
            `Tried to load an already blacklisted config with update hash ${newUpdateHash}, skipping update`
          );
          return;
        }

        if (newUpdateHash !== this.currentUpdateHash) {
          logger.info(`New update config hash ${newUpdateHash}`);
          const { configuration, signatures } = await this.configLoader.load();
          const configHash = ConfigUpdater.calculateConfigHash(configuration);
          if (this.signatures.required) {
            const verificationError = this.verifySignatures(
              configHash,
              signatures
            );
            if (verificationError) {
              logger.error(verificationError);
              this.history.add({
                configHash,
                updateHash: newUpdateHash,
                blacklisted: true,
              });
              return;
            }
          }
          this.transactionalWrite(
            configuration,
            `${HISTORICAL_CONFIG_DIR_PREFIX}${configHash}`
          );

          this.history.add({
            configHash,
            updateHash: newUpdateHash,
            blacklisted: false,
          });
          this.currentUpdateHash = newUpdateHash;
          this.emit("new_config", configHash);
        } else {
          logger.debug(`Remote config hash did not change.`);
        }
      } catch (e) {
        // this function MUST NOT throw
        logger.error(`Config load failed ${RedstoneCommon.stringifyError(e)}`);
      }
    };

    // perform an initial config load when Oracle Node is starting
    await checkConfigUpdatedFn();

    const cronScheduleString = RedstoneCommon.intervalMsToCronFormat(
      this.timestampMillisecondsInterval
    );

    scheduleJob(cronScheduleString, checkConfigUpdatedFn);

    // i.e., an initial remote config load failed - we need to restart on local backup
    if (this.currentUpdateHash === null) {
      throw new Error("Initial config load failed");
    }
  }

  static calculateConfigHash(loadedConfig: FileData[]): string {
    return calculateBuffersHash(loadedConfig.map(({ content }) => content));
  }

  private verifySignatures(
    configHash: string,
    signatures: FileData[]
  ): string | null {
    if (signatures.length < this.signatures.minRequiredSignatures) {
      return `Not enough signatures, expected: ${this.signatures.minRequiredSignatures},
       actual: ${signatures.length}`;
    }

    const uniqueAddresses = new Set<string>();
    for (const signature of signatures) {
      const signerAddress = ConfigUpdater.extractSignerAddress(
        signature.content.toString(),
        configHash
      );
      if (signerAddress === null) {
        continue;
      }
      if (!this.signatures.trustedAddresses.has(signerAddress)) {
        logger.warn(
          `Signing address ${signerAddress} is not among trusted addresses.`
        );
        continue;
      }
      logger.debug(`Signature for ${signerAddress} verified properly`);

      uniqueAddresses.add(signerAddress);
    }
    if (uniqueAddresses.size < this.signatures.minRequiredSignatures) {
      return `Not enough trusted signatures for config with hash ${configHash}.
       Expected ${this.signatures.minRequiredSignatures}, actual: ${uniqueAddresses.size}`;
    }
    return null;
  }

  static extractSignerAddress(
    signature: string,
    configHash: string
  ): string | null {
    try {
      if (!signature.startsWith("0x")) {
        signature = "0x" + signature;
      }
      logger.debug("Verifying signature", signature);

      return ethers.utils.verifyMessage(configHash, signature);
    } catch (e) {
      logger.error(
        `Error while verifying signature ${RedstoneCommon.stringifyError(e)}`
      );
      return null;
    }
  }

  /**
   * Write files to a temporary transaction directory and then atomically update a symlink.
   * If any write fails, the changes are discarded.
   */
  private transactionalWrite(newFiles: FileData[], tempDir: string) {
    try {
      for (const file of newFiles) {
        const filePath = path.join(tempDir, file.filePath);
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, file.content);
      }

      ConfigUpdater.createSymlink(this.configBasePath, tempDir);
      logger.debug("Config files update transaction committed.");
    } catch (err) {
      logger.error(
        "Error during config update transaction, rolling back:",
        err
      );
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw err;
    }
  }

  mustRestoreConfig(): string {
    const prevConfig = this.history.previousNonBlacklistedConfig();
    if (prevConfig === null) {
      throw new Error(
        "There should be at least one, non blacklisted config - i.e. the local dev config"
      );
    }

    let historicalConfigDir: string;
    if (prevConfig.updateHash === BACKUP_UPDATE_HASH) {
      logger.warn(
        `Historical, non-blacklisted remote config not found.
         Falling back to a local dev configuration backup. If this is not caused by a fresh node deployment
         and lack of compatible remote config available yet - proceed with care!`
      );
      historicalConfigDir = BACKUP_CONFIG_DIR;
    } else {
      historicalConfigDir = `${HISTORICAL_CONFIG_DIR_PREFIX}${prevConfig.configHash}`;
    }

    const configDir = this.configBasePath;
    ConfigUpdater.createSymlink(configDir, historicalConfigDir);

    logger.debug(
      `Config files restored to hash ${prevConfig.configHash} from dir ${historicalConfigDir} to dir ${configDir}.`
    );
    this.currentUpdateHash = prevConfig.updateHash;
    this.history.add(prevConfig);

    return prevConfig.configHash;
  }

  private static createSymlink(nodeConfigDir: string, backupDir: string) {
    try {
      fs.unlinkSync(nodeConfigDir);
    } catch (_e) {
      logger.warn(`Symlink did not exist ${nodeConfigDir}`);
      if (fs.existsSync(nodeConfigDir)) {
        // not recoverable, process will be stopped.
        terminateWithRemoteConfigError(
          RedstoneCommon.stringifyError(
            "Original node-remote-config folder still exists. There is a bug in ConfigUpdater."
          )
        );
      }
    }

    fs.symlinkSync(backupDir, nodeConfigDir);
  }

  private prepareBackupConfig() {
    try {
      // it might be the case in consecutive runs of the node - either
      // within the Docker container or directly on the host machine.
      if (fs.existsSync(`${BACKUP_CONFIG_DIR}`)) {
        logger.warn(
          "Backup config folder already exists, not creating a new one"
        );
        return calculateDirectoryHash(BACKUP_CONFIG_DIR);
      }

      /**
       * in case of oracle-node configLocation should resolve to either:
       * 1. for a node running within a docker container - /app/node-remote-config
       * 2. for a node running on the host machine - /(...)/redstone-monorepo-priv/packages/node-remote-config
       */
      const configLocation = findDirOrThrow(this.configBasePath);
      const sourceBackupPath = path.join(
        configLocation,
        this.backupConfigSourceFolder
      );
      logger.info("Local source backup path", sourceBackupPath);
      const configHash = calculateDirectoryHash(sourceBackupPath);
      logger.info("Backup configuration hash", configHash);

      // cp `${configLocation}/dev` to ./config_backup dir
      // BACKUP_CONFIG_DIR directory will serve as a config "source" if none of the remote configs
      // work properly
      fs.cpSync(sourceBackupPath, BACKUP_CONFIG_DIR, { recursive: true });

      if (fs.existsSync(`./${this.configBasePath}`)) {
        // rm -r ./node-remote-config - the remote config will be symlinked to this location,
        // so removing the original content

        // note: this only applies to the case when the node is running within a docker container,
        // and the original config folder is put into /app/node-remote-config when
        // the Docker image is built.
        fs.rmSync(`./${this.configBasePath}`, { recursive: true });
      }
      return configHash;
    } catch (e) {
      // not recoverable, process will be stopped.
      terminateWithRemoteConfigError(
        `Error while preparing backup configuration: ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
}
