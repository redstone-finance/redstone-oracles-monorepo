import { promiseTimeout, TimeoutError } from "../../src/utils/promise-timeout";

describe("promiseTimeout", () => {
  test("should returns resolved value", async () => {
    const resolvedPromise = () => Promise.resolve("I am resolved");
    const resolvedValue = await promiseTimeout(() => resolvedPromise(), 0);
    expect(resolvedValue).toBe("I am resolved");
  });

  test("should throw timeout error", async () => {
    const promise = () =>
      new Promise((resolve) => setTimeout(() => resolve("I am resolved"), 10));
    await expect(promiseTimeout(promise, 0)).rejects.toThrowError(
      new TimeoutError()
    );
  });

  test("should throw any error", async () => {
    const rejectPromise = () => Promise.reject(new Error("Rejected promise"));
    await expect(promiseTimeout(rejectPromise, 0)).rejects.toThrowError(
      "Rejected promise"
    );
  });
});
