import { loggerFactory } from "@redstone-finance/utils";

// TODO: deduplicate
const logger = loggerFactory("Terminator");

export enum ExitCodes {
  UnknownCriticalError = 1,

  ManifestConfigError = 101,
  NodeRemoteConfigError = 102,
  RpcsConfigError = 103,
  RestartConfigExitCode = 100,
}

export function terminateWithManifestConfigError(errorDetails: string): never {
  logger.error(
    `Manifest configuration error: ${errorDetails}.\n` +
      `Terminating with exit code ${ExitCodes.ManifestConfigError}`
  );

  process.exit(ExitCodes.ManifestConfigError);
}

export function terminateWithUnknownCriticalError(errorDetails: string): never {
  logger.error(
    `Unknown critical error: ${errorDetails}.\n` +
      `Terminating with exit code ${ExitCodes.UnknownCriticalError}`
  );
  process.exit(ExitCodes.UnknownCriticalError);
}

export function terminateWithUpdateConfigExitCode(): never {
  process.exit(ExitCodes.RestartConfigExitCode);
}

export function terminateWithRemoteConfigError(errorDetails: string): never {
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
