import { AgreementExecutor, Eligibility, EligibilityExecutor } from "../../src/multi-executor";

const ELIGIBLE_DESCRIPTIONS = ["https://rpc-a.example.com", "https://rpc-b.example.com"];
const RESTRICTED_DESCRIPTION = "https://rpc-restricted.example.com";
const REJECTED_DESCRIPTION = "https://rpc-rejected.example.com";
const AGREED = "0xagreed";
const DISAGREED = "0xdisagreed";
const QUORUM = 2;

describe("EligibilityExecutor", () => {
  let executed: string[];
  let result: string;

  beforeEach(async () => {
    executed = [];
    const leaves: { description: string; value: string; isEligible?: Eligibility }[] = [
      ...ELIGIBLE_DESCRIPTIONS.map((description) => ({ description, value: AGREED })),
      { description: REJECTED_DESCRIPTION, value: DISAGREED },
      {
        description: RESTRICTED_DESCRIPTION,
        value: DISAGREED,
        isEligible: (description) => description !== RESTRICTED_DESCRIPTION,
      },
    ];
    const sut = new EligibilityExecutor(
      new AgreementExecutor<string>(QUORUM, undefined),
      (description) => description !== REJECTED_DESCRIPTION
    );

    result = await sut.execute(
      leaves.map(({ description, value, isEligible }, index) => ({
        name: "call",
        index,
        description,
        isEligible,
        fn: () => {
          executed.push(description);

          return Promise.resolve(value);
        },
      }))
    );
  });

  it("returns the result the eligible functions agree on", () => {
    expect(result).toBe(AGREED);
  });

  it("runs only the functions passing both the given and their own eligibility", () => {
    expect(executed).toEqual(ELIGIBLE_DESCRIPTIONS);
  });
});
