import { expect } from "chai";
import sinon from "sinon";
import {
  isPaused,
  MAX_PAUSE_FUTURE_TIMESTAMP_HOURS,
} from "../../src/config/is-paused";

describe("isPaused function", () => {
  let clock: sinon.SinonFakeTimers;
  const MAX_PAUSE_FUTURE_TIMESTAMP =
    MAX_PAUSE_FUTURE_TIMESTAMP_HOURS * 60 * 60 * 1000;

  beforeEach(() => {
    clock = sinon.useFakeTimers(new Date("2023-01-01T12:00:00Z").getTime());
  });

  afterEach(() => {
    clock.restore();
  });

  it("should return false when isPausedUntil is undefined", () => {
    const relayerConfig = {
      isPausedUntil: undefined,
    };

    expect(isPaused(relayerConfig)).to.be.false;
  });

  it("should return true when current time is before isPausedUntil", () => {
    const futureDate = new Date();
    futureDate.setMilliseconds(futureDate.getMilliseconds() + 1);

    const relayerConfig = {
      isPausedUntil: futureDate,
    };

    expect(isPaused(relayerConfig)).to.be.true;
  });

  it("should return false when current time is after isPausedUntil", () => {
    const pastDate = new Date();
    pastDate.setMilliseconds(pastDate.getMilliseconds() - 1);

    const relayerConfig = {
      isPausedUntil: pastDate,
    };

    expect(isPaused(relayerConfig)).to.be.false;
  });

  it("should return false when isPausedUntil is too far in the future", () => {
    const farFutureDate = new Date();
    farFutureDate.setHours(
      farFutureDate.getHours() + MAX_PAUSE_FUTURE_TIMESTAMP_HOURS
    );
    farFutureDate.setMilliseconds(farFutureDate.getMilliseconds() + 1);

    const relayerConfig = {
      isPausedUntil: farFutureDate,
    };

    expect(isPaused(relayerConfig)).to.be.false;
  });

  it("should return true when isPausedUntil is at MAX_PAUSE_FUTURE_TIMESTAMP boundary", () => {
    const futureDate = new Date(Date.now() + MAX_PAUSE_FUTURE_TIMESTAMP);

    const relayerConfig = {
      isPausedUntil: futureDate,
    };

    expect(isPaused(relayerConfig)).to.be.true;
  });

  it("should return false when isPausedUntil is close to the MAX_PAUSE_FUTURE_TIMESTAMP boundary", () => {
    const futureDate = new Date(Date.now() + MAX_PAUSE_FUTURE_TIMESTAMP + 1);

    const relayerConfig = {
      isPausedUntil: futureDate,
    };

    expect(isPaused(relayerConfig)).to.be.false;
  });

  it("should handle time progression correctly", () => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 30);

    const relayerConfig = {
      isPausedUntil: futureDate,
    };

    expect(isPaused(relayerConfig)).to.be.true;

    clock.tick(30 * 60 * 1000 + 1);

    expect(isPaused(relayerConfig)).to.be.false;
  });
});
