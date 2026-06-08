import { CantonTrafficMeter } from "../../src/tx/CantonTrafficMeter";

export abstract class ResetableCantonTrafficMeter extends CantonTrafficMeter {
  static resetAccumulatingInstance() {
    CantonTrafficMeter.accumulatingInstance = undefined;
  }

  static override get logger() {
    return CantonTrafficMeter.logger;
  }
}
