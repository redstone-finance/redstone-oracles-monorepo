/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpClient } from "@redstone-finance/http-client";
import { RedstoneCommon } from "@redstone-finance/utils";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { RedstoneEthers5Provider, RedstoneProvider } from "../../src/providers/RedstoneProvider";

chai.use(chaiAsPromised);

const DEFAULT_HTTP_CLIENT_OPTIONS = {
  maxSockets: 100,
  maxTotalSockets: 1000,
  keepAliveMsecs: 60_000,
  keepAlive: true,
  scheduling: "fifo" as const,
  maxContentLength: 10_000_000,
  timeout: 5_000,
};

describe("RedstoneProvider", () => {
  let httpClient: HttpClient;
  let redstoneProvider: RedstoneProvider;

  beforeEach(() => {
    httpClient = new HttpClient(DEFAULT_HTTP_CLIENT_OPTIONS);
    redstoneProvider = new RedstoneProvider(httpClient, "http://localhost:8545");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("send", () => {
    it("should send RPC request and return result", async () => {
      const postStub = sinon.stub(httpClient, "post").resolves({
        data: {
          jsonrpc: "2.0",
          id: 1,
          result: "0x1",
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      const result = await redstoneProvider.send<string>("eth_blockNumber", []);

      expect(result).to.equal("0x1");
      expect(postStub.calledOnce).to.be.true;
    });

    it("should throw error when RPC returns error", async () => {
      sinon.stub(httpClient, "post").resolves({
        data: {
          jsonrpc: "2.0",
          id: 1,
          result: undefined,
          error: { code: -32000, message: "Server error" },
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      await expect(redstoneProvider.send<string>("eth_blockNumber", [])).to.be.rejectedWith(
        "Server error"
      );
    });

    it("should throw error when response id does not match", async () => {
      sinon.stub(httpClient, "post").resolves({
        data: {
          jsonrpc: "2.0",
          id: 999,
          result: "0x1",
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      await expect(redstoneProvider.send<string>("eth_blockNumber", [])).to.be.rejectedWith(
        /Invalid id received/
      );
    });
  });
});

describe("RedstoneEthers5Provider", () => {
  let httpClient: HttpClient;
  let redstoneProvider: RedstoneProvider;
  let ethers5Provider: RedstoneEthers5Provider;

  beforeEach(() => {
    httpClient = new HttpClient(DEFAULT_HTTP_CLIENT_OPTIONS);
    redstoneProvider = new RedstoneProvider(httpClient, "http://localhost:8545");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getBlockNumber caching", () => {
    it("should have caching enabled by default", () => {
      ethers5Provider = new RedstoneEthers5Provider(redstoneProvider, {
        name: "localhost",
        chainId: 1337,
      });

      // Access private property to verify it's been initialized with caching
      expect((ethers5Provider as any).blockNumberCacheOpts.isCacheEnabled).to.be.true;
      expect((ethers5Provider as any).blockNumberCacheOpts.ttl).to.equal(100);
    });

    it("should cache getBlockNumber calls within TTL", async () => {
      ethers5Provider = new RedstoneEthers5Provider(
        redstoneProvider,
        { name: "localhost", chainId: 1337 },
        500,
        60_000,
        { isCacheEnabled: true, ttl: 1000 } // 1 second TTL
      );

      const sendStub = sinon.stub(redstoneProvider, "send").resolves("0x64"); // 100 in hex

      // First call - should hit the RPC
      const result1 = await ethers5Provider.getBlockNumber();
      expect(result1).to.equal(100);
      expect(sendStub.calledOnce).to.be.true;

      // Second call within TTL - should use cache
      const result2 = await ethers5Provider.getBlockNumber();
      expect(result2).to.equal(100);
      expect(sendStub.calledOnce).to.be.true; // Still only called once

      // Third call within TTL - should still use cache
      const result3 = await ethers5Provider.getBlockNumber();
      expect(result3).to.equal(100);
      expect(sendStub.calledOnce).to.be.true; // Still only called once
    });

    it("should refresh cache after TTL expires", async () => {
      const ttl = 100; // 100ms TTL
      ethers5Provider = new RedstoneEthers5Provider(
        redstoneProvider,
        { name: "localhost", chainId: 1337 },
        500,
        60_000,
        { isCacheEnabled: true, ttl }
      );

      const sendStub = sinon
        .stub(redstoneProvider, "send")
        .onFirstCall()
        .resolves("0x64") // 100 in hex
        .onSecondCall()
        .resolves("0x65"); // 101 in hex

      // First call - should hit the RPC
      const result1 = await ethers5Provider.getBlockNumber();
      expect(result1).to.equal(100);
      expect(sendStub.calledOnce).to.be.true;

      // Wait for TTL to expire
      await RedstoneCommon.sleep(ttl + 50);

      // Second call after TTL - should hit the RPC again
      const result2 = await ethers5Provider.getBlockNumber();
      expect(result2).to.equal(101);
      expect(sendStub.calledTwice).to.be.true;
    });

    it("should not cache when caching is disabled", async () => {
      ethers5Provider = new RedstoneEthers5Provider(
        redstoneProvider,
        { name: "localhost", chainId: 1337 },
        500,
        60_000,
        { isCacheEnabled: false, ttl: 100 } // Disable caching
      );

      const sendStub = sinon.stub(redstoneProvider, "send").resolves("0x64");

      // First call
      const result1 = await ethers5Provider.getBlockNumber();
      expect(result1).to.equal(100);
      expect(sendStub.calledOnce).to.be.true;

      // Second call - should hit RPC again because caching is disabled
      const result2 = await ethers5Provider.getBlockNumber();
      expect(result2).to.equal(100);
      expect(sendStub.calledTwice).to.be.true;

      // Third call - should hit RPC again
      const result3 = await ethers5Provider.getBlockNumber();
      expect(result3).to.equal(100);
      expect(sendStub.calledThrice).to.be.true;
    });

    it("should use custom cacheTTL when provided", async () => {
      const customTTL = 50; // 50ms
      ethers5Provider = new RedstoneEthers5Provider(
        redstoneProvider,
        { name: "localhost", chainId: 1337 },
        500,
        60_000,
        { isCacheEnabled: true, ttl: customTTL }
      );

      expect((ethers5Provider as any).blockNumberCacheOpts.ttl).to.equal(customTTL);

      const sendStub = sinon
        .stub(redstoneProvider, "send")
        .onFirstCall()
        .resolves("0x64")
        .onSecondCall()
        .resolves("0x65");

      // First call
      await ethers5Provider.getBlockNumber();
      expect(sendStub.calledOnce).to.be.true;

      // Wait less than TTL
      await RedstoneCommon.sleep(customTTL - 20);
      await ethers5Provider.getBlockNumber();
      expect(sendStub.calledOnce).to.be.true; // Still cached

      // Wait for TTL to expire
      await RedstoneCommon.sleep(30);
      await ethers5Provider.getBlockNumber();
      expect(sendStub.calledTwice).to.be.true; // Cache expired
    });

    it("should handle errors correctly and not cache failed requests", async () => {
      ethers5Provider = new RedstoneEthers5Provider(
        redstoneProvider,
        { name: "localhost", chainId: 1337 },
        500,
        60_000,
        { isCacheEnabled: true, ttl: 1000 }
      );

      const sendStub = sinon
        .stub(redstoneProvider, "send")
        .onFirstCall()
        .rejects(new Error("Network error"))
        .onSecondCall()
        .resolves("0x64");

      // First call - should fail
      await expect(ethers5Provider.getBlockNumber()).to.be.rejectedWith("Network error");
      expect(sendStub.calledOnce).to.be.true;

      // Second call - should try again (error should not be cached)
      const result = await ethers5Provider.getBlockNumber();
      expect(result).to.equal(100);
      expect(sendStub.calledTwice).to.be.true;
    });

    it("should parse hex block numbers correctly", async () => {
      // Disable caching for this test to ensure we actually test hex parsing
      ethers5Provider = new RedstoneEthers5Provider(
        redstoneProvider,
        { name: "localhost", chainId: 1337 },
        500,
        60_000,
        { isCacheEnabled: false, ttl: 100 } // Disable caching
      );

      const testCases = [
        { hex: "0x0", expected: 0 },
        { hex: "0x1", expected: 1 },
        { hex: "0xa", expected: 10 },
        { hex: "0x64", expected: 100 },
        { hex: "0x3e8", expected: 1000 },
        { hex: "0xf4240", expected: 1000000 },
      ];

      for (const testCase of testCases) {
        const sendStub = sinon.stub(redstoneProvider, "send").resolves(testCase.hex);
        const result = await ethers5Provider.getBlockNumber();
        expect(result).to.equal(testCase.expected);
        sendStub.restore();
      }
    });
  });

  describe("getNetwork", () => {
    it("should return the network provided in constructor", async () => {
      const network = { name: "mainnet", chainId: 1 };
      ethers5Provider = new RedstoneEthers5Provider(redstoneProvider, network);

      const result = await ethers5Provider.getNetwork();
      expect(result).to.deep.equal(network);
    });
  });
});
