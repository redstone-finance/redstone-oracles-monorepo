import { RedstoneCommon } from "@redstone-finance/utils";
import { API_TYPE_JITO, API_TYPE_RPC, SolanaApi } from "../src";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const JITO_URL = "https://mainnet.block-engine.jito.wtf";

describe("SolanaApi", () => {
  it("defaults an untagged url to the rpc type", () => {
    expect(SolanaApi.parseUrl(RPC_URL)).toMatchObject({
      type: API_TYPE_RPC,
      host: "api.mainnet-beta.solana.com",
      baseUrl: `${RPC_URL}/`,
    });
  });

  it("classifies a #type=jito url and strips the fragment from baseUrl", () => {
    expect(SolanaApi.parseUrl(`${JITO_URL}#type=jito`)).toMatchObject({
      type: API_TYPE_JITO,
      host: "mainnet.block-engine.jito.wtf",
      baseUrl: `${JITO_URL}/`,
    });
  });

  it("rejects an unknown url type", () => {
    expect(() => SolanaApi.parseUrl(`${RPC_URL}#type=unknown`)).toThrow();
  });

  it("groups urls by type via splitUrls", () => {
    const grouped = RedstoneCommon.splitUrls(
      [RPC_URL, `${JITO_URL}#type=jito`],
      SolanaApi.parseUrl
    );

    expect(grouped[API_TYPE_JITO]).toMatchObject([
      { type: API_TYPE_JITO, host: "mainnet.block-engine.jito.wtf", baseUrl: `${JITO_URL}/` },
    ]);
    expect(grouped[API_TYPE_RPC]).toMatchObject([
      { type: API_TYPE_RPC, host: "api.mainnet-beta.solana.com", baseUrl: `${RPC_URL}/` },
    ]);
  });
});
