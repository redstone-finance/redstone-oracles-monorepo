import { Executor, FnBox } from "../../src/multi-executor";

const ELIGIBLE_RPC_URL = "https://rpc-eligible";
const INELIGIBLE_RPC_URL = "https://rpc-ineligible";
const RPC_URLS = [ELIGIBLE_RPC_URL, INELIGIBLE_RPC_URL];

describe("Executor", () => {
  let executed: string[];

  beforeEach(async () => {
    executed = [];
    const functions: FnBox<string>[] = RPC_URLS.map((description, index) => ({
      name: "call",
      index,
      description,
      fn: () => {
        executed.push(description);

        return Promise.resolve(description);
      },
      isEligible: (rpc) => rpc !== INELIGIBLE_RPC_URL,
    }));

    await Promise.all(Executor.getPromises(functions));
  });

  it("runs only the functions whose rpc is eligible", () => {
    expect(executed).toEqual([ELIGIBLE_RPC_URL]);
  });
});
