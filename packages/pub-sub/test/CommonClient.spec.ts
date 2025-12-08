import { HttpClient } from "@redstone-finance/http-client";
import { RedstoneLogger } from "@redstone-finance/utils";
import { ClientCommon } from "../src/light-gateway-clients/ClientCommon";

describe("ClientCommon constructor", () => {
  const createClient = (lightGatewayAddress: string) => {
    const mockHttpClient = {} as HttpClient;
    const mockLogger = {} as RedstoneLogger;

    return new ClientCommon(mockHttpClient, lightGatewayAddress, mockLogger);
  };

  describe("protocol handling", () => {
    it("adds http:// when protocol is missing", () => {
      const client = createClient("example.com");

      expect(client.lightGatewayAddress).toBe("http://example.com");
    });

    it("preserves http:// protocol", () => {
      const client = createClient("http://example.com");

      expect(client.lightGatewayAddress).toBe("http://example.com");
    });

    it("preserves https:// protocol", () => {
      const client = createClient("https://example.com");

      expect(client.lightGatewayAddress).toBe("https://example.com");
    });

    it("adds http:// to IP address", () => {
      const client = createClient("192.168.1.1:8080");

      expect(client.lightGatewayAddress).toBe("http://192.168.1.1:8080");
    });

    it("removes trailing slash", () => {
      const client = createClient("https://example.com/");

      expect(client.lightGatewayAddress).toBe("https://example.com");
    });

    it("removes trailing slash without protocol", () => {
      const client = createClient("example.com/");

      expect(client.lightGatewayAddress).toBe("http://example.com");
    });

    it("preserves address without trailing slash", () => {
      const client = createClient("https://example.com");

      expect(client.lightGatewayAddress).toBe("https://example.com");
    });

    it("adds protocol and removes trailing slash", () => {
      const client = createClient("example.com/");

      expect(client.lightGatewayAddress).toBe("http://example.com");
    });
  });
});
