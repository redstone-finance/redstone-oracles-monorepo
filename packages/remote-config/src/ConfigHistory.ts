import { loggerFactory } from "@redstone-finance/utils";

// note: the backup has no update hash (e.g., the AWS ETag),
// only the config hash (i.e., combined hash of the config content)
export const BACKUP_UPDATE_HASH = "BACKUP_UPDATE_HASH";

export type HistoricalConfig = {
  // i.e., hash calculated based on the config file contents
  configHash: string;
  // i.e., ETag of the .zip file in AWS S3.
  updateHash: string;
  // true if Oracle node did not start properly with this config
  blacklisted: boolean;
};

const logger = loggerFactory("ConfigHistory");

export class ConfigHistory {
  // note: oldest entries are stored at the end
  private readonly history: HistoricalConfig[] = [];

  add(config: HistoricalConfig) {
    this.history.unshift(config);
  }

  isUpdateHashBlacklisted(updateHash: string) {
    return this.history.some(
      (c) => c.updateHash === updateHash && c.blacklisted
    );
  }

  blacklistConfigHash(configHash: string) {
    const historicalConfig = this.history.find(
      (c) => c.configHash === configHash
    );
    if (!historicalConfig) {
      logger.warn(
        `Historical config with hash ${configHash} not found - cannot blacklist`
      );
      return;
    }
    historicalConfig.blacklisted = true;
  }

  previousNonBlacklistedConfig(): HistoricalConfig | null {
    for (const historicalConfigHash of this.history) {
      if (!historicalConfigHash.blacklisted) {
        return historicalConfigHash;
      }
    }
    return null;
  }
}
