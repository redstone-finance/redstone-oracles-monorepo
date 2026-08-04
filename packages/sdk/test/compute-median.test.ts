import {
  DataPackage,
  NumericDataPoint,
  type SignedDataPackagePlainObj,
} from "@redstone-finance/protocol";
import { computeMedian, verifyAndComputeMedian } from "../src";

const SIGNER_1 = {
  privateKey: "0xfae81e7c122f2ad245be182d88889e6a037bbeebd7de7bb5ca10f891d359e440",
  address: "0x701790Ca360222a7e34212175280907e1572EbE6",
};
const SIGNER_2 = {
  privateKey: "0x548e7c2fae09cc353ffe54ed40609d88a99fab24acfc81bfbf29cd6a638b4958",
  address: "0x8559361F0e878c73379cB15A46D6B058EF070E5A",
};
const SIGNER_3 = {
  privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
};

function makePackage(value: number, signer = SIGNER_1, feedId = "ETH"): SignedDataPackagePlainObj {
  const dp = new DataPackage(
    [new NumericDataPoint({ dataFeedId: feedId, value })],
    1_000_000,
    feedId
  );

  return dp.sign(signer.privateKey).toObj();
}

/** Manually craft a plain-obj with a string value (no real signature needed for computeMedian). */
function makeStringValuePackage(value: string, feedId = "ETH"): SignedDataPackagePlainObj {
  return {
    dataPoints: [{ dataFeedId: feedId, value }],
    timestampMilliseconds: 1_000_000,
    dataPackageId: feedId,
    signature: "ZmFrZQ==", // base64("fake") – not verified by computeMedian
  };
}

describe("computeMedian", () => {
  it("returns median for odd number of packages", () => {
    const packages = [makePackage(1), makePackage(3), makePackage(2)];
    expect(computeMedian(packages)).toBe(2);
  });

  it("returns average of two middle values for even number of packages", () => {
    const packages = [makePackage(1), makePackage(2), makePackage(3), makePackage(4)];
    expect(computeMedian(packages)).toBe(2.5);
  });

  it("handles a single package", () => {
    expect(computeMedian([makePackage(42)])).toBe(42);
  });

  it("throws on empty array", () => {
    expect(() => computeMedian([])).toThrow("packages array must not be empty");
  });

  it("throws when a package has more than one data point (MultiFeedPackage)", () => {
    const multiFeedPackage = new DataPackage(
      [
        new NumericDataPoint({ dataFeedId: "ETH", value: 1 }),
        new NumericDataPoint({ dataFeedId: "BTC", value: 2 }),
      ],
      1_000_000,
      "ETH"
    )
      .sign(SIGNER_1.privateKey)
      .toObj();

    expect(() => computeMedian([multiFeedPackage])).toThrow("MultiFeedPackages are not supported");
  });

  it("throws on non-numeric string value", () => {
    const pkg = makeStringValuePackage("not-a-number");
    expect(() => computeMedian([pkg])).toThrow(
      'computeMedian: package "ETH" has unexpected value type "string only number is supported"'
    );
  });
});

describe("verifyAndComputeMedian", () => {
  const SIGNER_1_ADDRESS = SIGNER_1.address;
  const SIGNER_2_ADDRESS = SIGNER_2.address;

  it("computes median from all packages when all signers are whitelisted", () => {
    const packages = [
      makePackage(10, SIGNER_1),
      makePackage(20, SIGNER_2),
      makePackage(30, SIGNER_1),
    ];
    const result = verifyAndComputeMedian(packages, [SIGNER_1_ADDRESS, SIGNER_2_ADDRESS]);
    expect(result).toBe(20);
  });

  it("filters out packages from non-whitelisted signers before computing median", () => {
    const packages = [
      makePackage(10, SIGNER_1), // whitelisted → kept
      makePackage(20, SIGNER_1), // whitelisted → kept
      makePackage(999, SIGNER_2), // NOT whitelisted → dropped
    ];
    const result = verifyAndComputeMedian(packages, [SIGNER_1_ADDRESS]);
    expect(result).toBe(15); // median of [10, 20]
  });

  it("is case-insensitive for signer addresses", () => {
    const packages = [makePackage(42, SIGNER_1)];
    expect(verifyAndComputeMedian(packages, [SIGNER_1_ADDRESS.toLowerCase()])).toBe(42);
    expect(verifyAndComputeMedian(packages, [SIGNER_1_ADDRESS.toUpperCase()])).toBe(42);
  });

  it("throws when no packages pass signature verification against the whitelist", () => {
    const packages = [makePackage(42, SIGNER_2)]; // SIGNER_2 not in whitelist
    expect(() => verifyAndComputeMedian(packages, [SIGNER_1_ADDRESS])).toThrow(
      "no packages from whitelisted signers found"
    );
  });

  it("throws on empty packages array (no whitelisted packages)", () => {
    expect(() => verifyAndComputeMedian([], [SIGNER_1_ADDRESS])).toThrow(
      "no packages from whitelisted signers found"
    );
  });

  it("silently discards packages with invalid signatures", () => {
    const validPkg = makePackage(50, SIGNER_1);
    const invalidPkg: SignedDataPackagePlainObj = {
      ...validPkg,
      signature: "aW52YWxpZA==", // base64("invalid") – bad signature
    };
    const result = verifyAndComputeMedian([validPkg, invalidPkg], [SIGNER_1_ADDRESS]);
    expect(result).toBe(50);
  });

  it("allows a third whitelisted signer to contribute to the median", () => {
    const packages = [
      makePackage(10, SIGNER_1),
      makePackage(20, SIGNER_2),
      makePackage(30, SIGNER_3),
    ];
    const result = verifyAndComputeMedian(packages, [
      SIGNER_1_ADDRESS,
      SIGNER_2_ADDRESS,
      SIGNER_3.address,
    ]);
    expect(result).toBe(20);
  });
});
