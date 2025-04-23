import { loggerFactory } from "@redstone-finance/utils";

// TODO: deduplicate
const logger = loggerFactory("Terminator");

export enum ExitCodes {
  ManifestConfigError = 1,
  NodeRemoteConfigError = 2,
  RpcsConfigError = 3,
  RestartConfigExitCode = 100,
}

export function terminateWithManifestConfigError(errorDetails: string): never {
  logger.error(
    `Manifest configuration error: ${errorDetails}.\n` +
      `Terminating with exit code ${ExitCodes.ManifestConfigError}`
  );

  process.exit(ExitCodes.ManifestConfigError);
}

export function terminateWithUpdateConfigExitCode(): never {
  process.exit(ExitCodes.RestartConfigExitCode);
}

export function terminateWithNodeRemoteConfigError(
  errorDetails: string
): never {
  logger.error(
    `Node configuration error: ${errorDetails}.\n` +
      `Terminating with exit code ${ExitCodes.NodeRemoteConfigError}`
  );

  process.exit(ExitCodes.NodeRemoteConfigError);
}

export function terminateWithRpcsConfigError(errorDetails: string): never {
  logger.error(
    `RPCs URLs configuration error: ${errorDetails}.\n` +
      `Terminating with exit code ${ExitCodes.RpcsConfigError}`
  );

  process.exit(ExitCodes.RpcsConfigError);
}
