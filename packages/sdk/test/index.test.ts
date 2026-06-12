import { getOracleRegistryState } from "../src";

describe("oracle registry state", () => {
  test("Should properly get oracle registry state", async () => {
    const state = await getOracleRegistryState();
    expect(Object.keys(state.dataServices).length).toBeGreaterThanOrEqual(8);
    expect(state.dataServices).toHaveProperty("redstone-primary-prod");
  });
});
