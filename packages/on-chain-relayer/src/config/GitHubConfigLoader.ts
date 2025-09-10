import { RedstoneRemoteConfig } from "@redstone-finance/remote-config";
import { loggerFactory } from "@redstone-finance/utils";

const logger = loggerFactory("GitHubConfigLoader");

type GitHubMetadata = {
  sha: string;
};

export class GitHubConfigLoader implements RedstoneRemoteConfig.IRemoteConfigLoader {
  private readonly manifestUrl: string;
  private readonly metadataUrl: string;

  constructor(
    repository: string, // e.g. redstone-finance/redstone-oracles-monorepo
    branch: string, // e.g. main
    repositoryPath: string, // e.g. packages/relayer-remote-config/main
    private readonly manifestPath: string // e.g. ./relayer-manifests-multi-feed/citreaTestnetMultiFeed.json
  ) {
    const { manifestUrl, metadataUrl } = GitHubConfigLoader.buildUrls(
      repository,
      branch,
      repositoryPath,
      manifestPath
    );
    this.manifestUrl = manifestUrl;
    this.metadataUrl = metadataUrl;
  }

  async load(): Promise<RedstoneRemoteConfig.ConfigData> {
    logger.debug("Fetching", this.manifestUrl);
    const response = await fetch(this.manifestUrl);
    if (!response.ok) {
      throw new Error(`Fetching from github failed. Status: ${response.status}`);
    }
    logger.debug("Successfully loaded relayer manifest");
    // const json = await response.json();

    return {
      configuration: [
        {
          filePath: this.manifestPath,
          content: Buffer.from(await response.arrayBuffer()),
        },
      ],
      signatures: [],
    };
  }

  async currentUpdateHash(): Promise<string> {
    logger.debug("Fetching", this.metadataUrl);
    const response = await fetch(this.metadataUrl);
    if (!response.ok) {
      throw new Error(`Fetching from github failed. Status: ${response.status}`);
    }
    const result = (await response.json()) as GitHubMetadata[];
    const sha = result[0].sha;
    logger.info("Current manifest update hash", sha);

    return sha;
  }

  static buildUrls(
    repository: string,
    branch: string,
    repositoryPath: string,
    manifestPath: string
  ) {
    return {
      manifestUrl: `https://raw.githubusercontent.com/${repository}/${branch}/${repositoryPath}/${manifestPath}`,
      metadataUrl: `https://api.github.com/repos/${repository}/commits?sha=${branch}&path=${repositoryPath}/${manifestPath}`,
    };
  }
}
