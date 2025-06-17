import { healthy, IterationsHealthCheck, unhealthy } from "../src/monitor";

describe("IterationsHealthCheck", () => {
  const PERIOD = "60";
  const MIN_REQUIRED = "2";
  const START_DEFAULT = "30";

  beforeEach(() => {
    jest.resetModules();
    process.env.HEALTHCHECK_ITERATION_PERIOD_S = PERIOD;
    process.env.HEALTHCHECK_ITERATION_MIN_REQUIRED_ITERATIONS = MIN_REQUIRED;
    process.env.HEALTHCHECK_ITERATION_START_PERIOD_S = START_DEFAULT;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is healthy if checked within the startup period", async () => {
    jest.useFakeTimers();
    const t0 = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(t0);

    const hc = new IterationsHealthCheck();
    const fireDate = new Date(t0.getTime() + 29_000);
    await expect(hc.check(fireDate)).resolves.toEqual(await healthy());
  });

  it("registers iterations when the event is emitted", () => {
    jest.useFakeTimers();
    const now = Date.now();
    jest.setSystemTime(now);

    const hc = new IterationsHealthCheck();
    hc.registerIteration();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const arr: number[] = (hc as any).iterationsDescTimes;
    expect(arr).toHaveLength(1);
    expect(arr[0]).toBe(now);
  });

  it("is healthy when at least the minimum number of iterations occur within the period", async () => {
    jest.useFakeTimers();
    const base = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(base);

    const hc = new IterationsHealthCheck();
    hc.registerIteration();
    jest.advanceTimersByTime(10_000);
    hc.registerIteration();
    const fireDate = new Date(base.getTime() + 20_000);
    await expect(hc.check(fireDate)).resolves.toEqual(await healthy());
  });

  it("prunes iterations older than the period and reports unhealthy if below minimum", async () => {
    jest.useFakeTimers();
    const base = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(base);

    const hc = new IterationsHealthCheck();
    // register one iteration at t=0
    hc.registerIteration();
    // advance past the 60s period
    jest.advanceTimersByTime(61_000);
    // register another iteration at t=61s
    hc.registerIteration();

    const fireDate = new Date(base.getTime() + 61_000);
    const expectedMsg = `1 iterations registered within last ${PERIOD}s, required: ${MIN_REQUIRED}`;
    await expect(hc.check(fireDate)).resolves.toEqual(
      await unhealthy([expectedMsg])
    );
  });

  it("pruneOldest() removes only entries older than the threshold", () => {
    const hc = new IterationsHealthCheck();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (hc as any).iterationsDescTimes = [5, 4, 3, 2, 1];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const removed = (hc as any).pruneOlderThan(3);
    expect(removed).toBe(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    expect((hc as any).iterationsDescTimes).toEqual([5, 4, 3]);
  });

  it("is unhealthy if no iterations occur outside the startup period", async () => {
    jest.useFakeTimers();
    const t0 = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(t0);

    const hc = new IterationsHealthCheck();
    const fireDate = new Date(
      t0.getTime() + (Number(START_DEFAULT) + 1) * 1000
    );
    const expectedMsg = `0 iterations registered within last ${PERIOD}s, required: ${MIN_REQUIRED}`;
    await expect(hc.check(fireDate)).resolves.toEqual(
      await unhealthy([expectedMsg])
    );
  });

  it("counts an iteration at the exact period boundary as within the period", async () => {
    process.env.HEALTHCHECK_ITERATION_PERIOD_S = "10";
    process.env.HEALTHCHECK_ITERATION_MIN_REQUIRED_ITERATIONS = "1";
    process.env.HEALTHCHECK_ITERATION_START_PERIOD_S = "0";

    jest.useFakeTimers();
    const t0 = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(t0);

    const hc = new IterationsHealthCheck();
    // advance to exactly 5s, emit
    jest.advanceTimersByTime(5_000);
    hc.registerIteration();
    // advance so that fireDate = t0 + 15s; threshold = 15 - 10 = 5s
    jest.advanceTimersByTime(10_000);

    const fireDate = new Date();
    await expect(hc.check(fireDate)).resolves.toEqual(await healthy());
  });

  it("does not count an iteration just before the period boundary", async () => {
    process.env.HEALTHCHECK_ITERATION_PERIOD_S = "10";
    process.env.HEALTHCHECK_ITERATION_MIN_REQUIRED_ITERATIONS = "1";
    process.env.HEALTHCHECK_ITERATION_START_PERIOD_S = "0";

    jest.useFakeTimers();
    const t0 = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(t0);

    const hc = new IterationsHealthCheck();
    // advance to 4.999s, emit
    jest.advanceTimersByTime(4_999);
    hc.registerIteration();
    // advance again to fireDate = t0 + 15s
    jest.advanceTimersByTime(10_001);

    const fireDate = new Date();
    const expectedMsg = `0 iterations registered within last 10s, required: 1`;
    await expect(hc.check(fireDate)).resolves.toEqual(
      await unhealthy([expectedMsg])
    );
  });

  it("respects a custom startPeriodInS from environment", async () => {
    process.env.HEALTHCHECK_ITERATION_PERIOD_S = "60";
    process.env.HEALTHCHECK_ITERATION_MIN_REQUIRED_ITERATIONS = "1";
    process.env.HEALTHCHECK_ITERATION_START_PERIOD_S = "5";

    jest.useFakeTimers();
    const t0 = new Date("2025-06-09T12:00:00.000Z");
    jest.setSystemTime(t0);

    const hc = new IterationsHealthCheck();
    const fireDate = new Date(t0.getTime() + 6_000);

    const expectedMsg = `0 iterations registered within last 60s, required: 1`;
    await expect(hc.check(fireDate)).resolves.toEqual(
      await unhealthy([expectedMsg])
    );
  });
});
