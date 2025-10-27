import { RedstoneCommon } from "@redstone-finance/utils";
import { err, ok, TxDeliveryMan } from "../src";

describe("TxDeliveryMan", () => {
  const createDeliveryMan = (maxAttempts = 3, timeoutMs = 5000) =>
    new TxDeliveryMan({
      maxTxSendAttempts: maxAttempts,
      expectedTxDeliveryTimeInMs: timeoutMs,
    });

  it("returns success on first attempt", async () => {
    const deliveryMan = createDeliveryMan();
    const attemptNumbers: number[] = [];

    const operation = (attempt: number) => {
      attemptNumbers.push(attempt);

      return Promise.resolve(ok({ data: "success" }));
    };

    const result = await deliveryMan.submit(operation);

    expect(result).toEqual(ok({ data: "success" }));
    expect(attemptNumbers).toEqual([0]);
  });

  it("retries and succeeds on second attempt", async () => {
    const deliveryMan = createDeliveryMan();
    const attemptNumbers: number[] = [];

    const operation = (attempt: number) => {
      attemptNumbers.push(attempt);

      return Promise.resolve(attempt === 0 ? err("first failure") : ok({ data: "success" }));
    };

    const result = await deliveryMan.submit(operation);

    expect(result).toEqual(ok({ data: "success" }));
    expect(attemptNumbers).toEqual([0, 1]);
  });

  it("accumulates errors when all attempts fail", async () => {
    const deliveryMan = createDeliveryMan(3);

    const operation = (attempt: number) => Promise.resolve(err(`error ${attempt + 1}`));

    const result = await deliveryMan.submit(operation);

    expect(result).toEqual(err(["error 1", "error 2", "error 3"]));
  });

  it("respects maxTxSendAttempts configuration", async () => {
    const deliveryMan = createDeliveryMan(5);
    const attemptNumbers: number[] = [];

    const operation = (attempt: number) => {
      attemptNumbers.push(attempt);

      return Promise.resolve(err("failure"));
    };

    await deliveryMan.submit(operation);

    expect(attemptNumbers).toEqual([0, 1, 2, 3, 4]);
  });

  it("stops retrying after first success", async () => {
    const deliveryMan = createDeliveryMan(5);
    const attemptNumbers: number[] = [];

    const operation = (attempt: number) => {
      attemptNumbers.push(attempt);

      return Promise.resolve(attempt === 2 ? ok({ value: 42 }) : err("not yet"));
    };

    const result = await deliveryMan.submit(operation);

    expect(result).toEqual(ok({ value: 42 }));
    expect(attemptNumbers).toEqual([0, 1, 2]);
  });

  it("returns all errors when exceptions occur on all attempts", async () => {
    const deliveryMan = createDeliveryMan(3);

    const operation = () => Promise.reject(new Error("persistent error"));

    const result = await deliveryMan.submit(operation);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.err).toHaveLength(3);
      result.err.forEach((error) => {
        expect(error).toContain("persistent error");
      });
    }
  });

  it("passes correct attempt numbers starting from zero", async () => {
    const deliveryMan = createDeliveryMan(4);
    const receivedAttempts: number[] = [];

    const operation = (attempt: number) => {
      receivedAttempts.push(attempt);

      return Promise.resolve(err("keep trying"));
    };

    await deliveryMan.submit(operation);

    expect(receivedAttempts).toEqual([0, 1, 2, 3]);
  });

  it("timeout all attempts", async () => {
    const deliveryMan = createDeliveryMan(2, 50);

    const operation = async () => {
      await RedstoneCommon.sleep(150);

      return ok({ data: "never returned" });
    };

    const result = await deliveryMan.submit(operation);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.err).toHaveLength(2);
      result.err.forEach((error) => {
        expect(error).toContain("Invocation timeout after 50ms");
      });
    }
  });
});
