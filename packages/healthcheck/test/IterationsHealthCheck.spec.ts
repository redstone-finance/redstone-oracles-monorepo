import { healthy, IterationsHealthCheck, unhealthy } from "../src/monitor";

describe("IterationsHealthCheck", () => {
  const PERIOD_S = "300";

  beforeEach(() => {
    jest.resetModules();
    process.env.HEALTHCHECK_ITERATION_PERIOD_S = PERIOD_S;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is healthy if checked within the startup period", async () => {
    jest.useFakeTimers();
    const t0 = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(t0);

    const hc = new IterationsHealthCheck();
    const fireDate = new Date(t0.getTime() + 299_000);
    await expect(hc.check(fireDate)).resolves.toEqual(await healthy());
  });

  it("is healthy when last iteration occur within the period", async () => {
    jest.useFakeTimers();
    const base = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(base);

    const hc = new IterationsHealthCheck();
    jest.advanceTimersByTime(301_000);
    hc.registerIteration();
    await expect(hc.check(new Date())).resolves.toEqual(await healthy());

    jest.advanceTimersByTime(290_000);
    await expect(hc.check(new Date())).resolves.toEqual(await healthy());

    jest.advanceTimersByTime(20_000);
    await expect(hc.check(new Date())).resolves.toEqual(
      await unhealthy(["Last iteration (2025-06-09T12:05:01.000Z) NOT within 300s"])
    );
  });

  it("is unhealthy if no iteration after startup period", async () => {
    jest.useFakeTimers();
    const base = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(base);

    const hc = new IterationsHealthCheck();
    jest.advanceTimersByTime(301_000);
    await expect(hc.check(new Date())).resolves.toEqual(
      await unhealthy(["Still no iteration registered"])
    );
  });

  it("is unhealthy if last iteration not in required period", async () => {
    jest.useFakeTimers();
    const base = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(base);

    const hc = new IterationsHealthCheck();
    hc.registerIteration();
    jest.advanceTimersByTime(299_999);
    await expect(hc.check(new Date())).resolves.toEqual(await healthy());

    jest.advanceTimersByTime(2);
    await expect(hc.check(new Date())).resolves.toEqual(
      await unhealthy(["Last iteration (2025-06-09T12:00:00.000Z) NOT within 300s"])
    );

    jest.advanceTimersByTime(10_000);
    hc.registerIteration();
    jest.advanceTimersByTime(100_000);
    await expect(hc.check(new Date())).resolves.toEqual(await healthy());
    jest.advanceTimersByTime(199_999);
    await expect(hc.check(new Date())).resolves.toEqual(await healthy());
    jest.advanceTimersByTime(1);
    await expect(hc.check(new Date())).resolves.toEqual(await healthy());

    jest.advanceTimersByTime(1);
    await expect(hc.check(new Date())).resolves.toEqual(
      await unhealthy(["Last iteration (2025-06-09T12:05:10.001Z) NOT within 300s"])
    );

    jest.advanceTimersByTime(10_000);
    await expect(hc.check(new Date())).resolves.toEqual(
      await unhealthy(["Last iteration (2025-06-09T12:05:10.001Z) NOT within 300s"])
    );

    jest.advanceTimersByTime(5_000);
    hc.registerIteration();
    jest.advanceTimersByTime(200_000);
    await expect(hc.check(new Date())).resolves.toEqual(await healthy());
  });
});
