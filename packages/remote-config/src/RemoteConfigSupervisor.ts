import { ExitCodes, terminateWithUnknownCriticalError } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { ChildProcess, spawn } from "node:child_process";
import { ConfigUpdater, IRemoteConfigLoader } from "./ConfigUpdater";

const logger = loggerFactory("ParentProcess");

const recoverableExitCodes = [ExitCodes.ManifestConfigError, ExitCodes.NodeRemoteConfigError];

export type RemoteConfigSupervisorOptions = {
  useRemoteConfig: boolean;
  /*
  the trustedRemoteConfigSigners and minRequiredConfigSignatures are
  required if verifyRemoteConfigSignatures is true
  */
  verifyRemoteConfigSignatures: boolean;
  trustedRemoteConfigSigners: string[];
  minRequiredConfigSignatures: number;
  configUpdateIntervalMs?: number;
  configLoader: () => IRemoteConfigLoader;
  childProcessPath: string;
  configBasePath: string;
  backupConfigSourceFolder: string;
};

export class RemoteConfigSupervisor {
  childProcess: ChildProcess | null = null;
  private configUpdater: ConfigUpdater | null = null;

  constructor(private readonly options: RemoteConfigSupervisorOptions) {
    /**
     * SIGKILL and SIGSTOP cannot have a listener installed.
     * https://nodejs.org/api/process.html#process_signal_events
     */
    ["SIGTERM", "SIGINT"].forEach((signal) => {
      process.on(signal, () => {
        if (this.childProcess) {
          // note: SIGTERM is normally sent to oracleNodeProcess
          // to schedule a restart during a configuration change
          // - that's why SIGKILL is being sent in this case
          this.childProcess.kill(signal === "SIGTERM" ? "SIGKILL" : (signal as NodeJS.Signals));
        }
        process.exit();
      });
    });

    process.on("uncaughtExceptionMonitor", (error) => {
      logger.error(
        `UNCAUGHT EXCEPTION - We have bug in our code. Don't ignore this error! error=${RedstoneCommon.stringifyError(error)}`
      );
    });
  }

  async startChildProcess() {
    try {
      if (this.options.useRemoteConfig) {
        logger.info(`Starting Child Process in a remote config mode`);
        this.configUpdater = new ConfigUpdater(
          this.options.configUpdateIntervalMs!,
          this.options.configLoader(),
          {
            required: this.options.verifyRemoteConfigSignatures,
            trustedAddresses: new Set(this.options.trustedRemoteConfigSigners),
            minRequiredSignatures: this.options.minRequiredConfigSignatures,
          },
          this.options.configBasePath,
          this.options.backupConfigSourceFolder
        );

        // note: handler wrapped in an arrow function to make linter happy.
        this.configUpdater.on("new_config", (configHash: string) =>
          this.handleNewConfig(configHash)
        );
        try {
          await this.configUpdater.start();
        } catch (e) {
          logger.error(
            "The initial attempt to load the remote configuration failed. The node will now start using a backup configuration.",
            RedstoneCommon.stringifyError(e)
          );
          this.restartOnPrevConfig();
        }
      } else {
        logger.info("Starting Runner in a legacy config mode");
        this.spawnAndAssignChildProcess("legacy_static_config");
      }
    } catch (e) {
      terminateWithUnknownCriticalError(
        `Please find details about the correct node launching at https://github.com/redstone-finance/redstone-node/blob/main/docs/PREPARE_ENV_VARIABLES.md error=${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  private handleNewConfig(configHash: string) {
    if (this.childProcess) {
      logger.info(`New config loaded with hash ${configHash}. Scheduling child process restart.`);
      try {
        this.addExitEventListener(configHash);
        this.scheduleRestart();
      } catch (error) {
        logger.error(
          "Error while killing the child process gracefully",
          RedstoneCommon.stringifyError(error)
        );
      }
    } else {
      logger.info(`Initial child process start with config hash ${configHash}.`);
      this.spawnAndAssignChildProcess(configHash);
    }
  }

  private scheduleRestart() {
    /**
     * Configuration Update Jitter
     * When configuration changes are detected, a randomized delay ("jitter") is applied
     * to the restart sequence. This prevents all nodes using the same configuration
     * from restarting simultaneously, which could cause service disruption or availability
     * issues in a distributed deployment.
     */
    const jitter = RemoteConfigSupervisor.generateJitter(10, 30);
    logger.info(`Restarting child process in ${jitter}ms`);
    setTimeout(() => {
      logger.info("Sending SIGTERM to child process");
      this.childProcess!.kill("SIGTERM");
    }, jitter);
  }

  private addExitEventListener(configHash: string) {
    this.childProcess!.removeAllListeners("exit");
    this.childProcess!.on("exit", (code, signal) => {
      if (code === ExitCodes.RestartConfigExitCode) {
        logger.info(`Restarting NodeRunner with a new configuration hash: ${configHash}.`);
        this.spawnAndAssignChildProcess(configHash);
      } else {
        RemoteConfigSupervisor.propagateChildProcessErrors(signal, code);
      }
    });
  }

  private spawnAndAssignChildProcess(configHash: string) {
    this.childProcess = spawn("node", [this.options.childProcessPath], {
      stdio: "inherit",
      env: { ...process.env, CONFIG_HASH: configHash },
    });

    this.childProcess.on("exit", (code, signal) => {
      if (code !== null && recoverableExitCodes.includes(code) && this.configUpdater) {
        logger.error(`Got ${code} error code, trying to restore previous config`);
        this.configUpdater.history.blacklistConfigHash(configHash);
        this.restartOnPrevConfig();
        return;
      }
      RemoteConfigSupervisor.propagateChildProcessErrors(signal, code);
    });

    logger.info(`Child process worker spawned with PID: ${this.childProcess.pid}`);
  }

  private restartOnPrevConfig() {
    const prevWorkingConfigHash = this.configUpdater!.mustRestoreConfig();
    logger.warn(`Restoring previous config with hash ${prevWorkingConfigHash}`);
    this.spawnAndAssignChildProcess(prevWorkingConfigHash);
  }

  /**
   * Error Propagation
   * If the child process terminates for any reason other than a scheduled
   * restart triggered by a configuration change, the exit signal is propagated to the parent process.
   * This ensures that the parent process can also terminate,
   * maintaining proper process cleanup and state consistency throughout the application hierarchy.
   */
  static propagateChildProcessErrors(signal: NodeJS.Signals | null, code: number | null) {
    if (signal) {
      logger.error(`Got kill signal ${signal} from Child Process`);
      process.kill(process.pid, signal);
    } else {
      logger.error(`Got exit code ${code} from Child Process`);
      process.exit(code);
    }
  }

  static generateJitter(minSeconds: number, maxSeconds: number): number {
    const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    return randomSeconds * 1000;
  }
}
