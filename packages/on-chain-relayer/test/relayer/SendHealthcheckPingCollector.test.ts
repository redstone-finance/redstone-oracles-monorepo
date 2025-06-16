import { expect } from "chai";
import sinon from "sinon";
import { SendHealthcheckPingCollector } from "../../src/SendHealthcheckPingCollector";

describe("SendHealthcheckPingCollector", () => {
  let mockSendHealthcheckPing: sinon.SinonStub;
  let collector: SendHealthcheckPingCollector;

  beforeEach(() => {
    mockSendHealthcheckPing = sinon.stub().resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      collector = new SendHealthcheckPingCollector(
        3,
        "https://example.com",
        mockSendHealthcheckPing
      );
      expect(collector["count"]).to.equal(3);
      expect(collector["url"]).to.equal("https://example.com");
      expect(collector["sentPings"]).to.deep.equal([false, false, false]);
    });

    it("should work without url parameter", () => {
      collector = new SendHealthcheckPingCollector(2);
      expect(collector["count"]).to.equal(2);
      expect(collector["url"]).to.be.undefined;
      expect(collector["sentPings"]).to.deep.equal([false, false]);
    });

    it("should use default sendHealthcheckPing when not provided", () => {
      collector = new SendHealthcheckPingCollector(2, "https://example.com");
      expect(collector["sendHealthcheckPingCallback"]).to.exist;
    });
  });

  describe("sendHealthcheckPing", () => {
    beforeEach(() => {
      collector = new SendHealthcheckPingCollector(
        3,
        "https://example.com",
        mockSendHealthcheckPing
      );
    });

    it("should return a function that marks ping as sent", async () => {
      const pingFunction = collector.sendHealthcheckPing(1);
      expect(pingFunction).to.be.a("function");

      await pingFunction();

      expect(collector["sentPings"][1]).to.be.true;
      expect(collector["sentPings"][0]).to.be.false;
      expect(collector["sentPings"][2]).to.be.false;
    });

    it("should throw error when index exceeds count", async () => {
      const pingFunction = collector.sendHealthcheckPing(3);

      try {
        await pingFunction();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.include("Index exceeded");
      }
    });

    it("should not call callback when not all pings are sent", async () => {
      const { ping0, ping1 } = makePings(collector);

      await ping0();
      await ping1();

      expect(mockSendHealthcheckPing.called).to.be.false;
    });

    it("should call callback when all pings are sent", async () => {
      const { ping0, ping1, ping2 } = makePings(collector);

      await ping0();
      await ping1();
      await ping2();

      expect(mockSendHealthcheckPing.calledOnce).to.be.true;
      expect(mockSendHealthcheckPing.calledWith("https://example.com")).to.be
        .true;
    });

    it("should reset pings after calling callback", async () => {
      const { ping0, ping1, ping2 } = makePings(collector);

      await ping0();
      await ping1();
      await ping2();

      expect(collector["sentPings"]).to.deep.equal([false, false, false]);
    });

    it("should handle multiple rounds of pings", async () => {
      // First round
      for (let i = 0; i < 3; i++) {
        await collector.sendHealthcheckPing(i)();
      }

      expect(mockSendHealthcheckPing.callCount).to.equal(1);

      // Second round
      for (let i = 0; i < 3; i++) {
        await collector.sendHealthcheckPing(i)();
      }

      expect(mockSendHealthcheckPing.callCount).to.equal(2);
    });

    it("should ignore the url parameter passed to returned function", async () => {
      const pingFunction = collector.sendHealthcheckPing(0);

      await pingFunction("https://different-url.com");

      expect(collector["sentPings"][0]).to.be.true;
    });
  });

  describe("edge cases", () => {
    it("should handle count of 1", async () => {
      collector = new SendHealthcheckPingCollector(
        1,
        "https://example.com",
        mockSendHealthcheckPing
      );

      await collector.sendHealthcheckPing(0)();

      expect(mockSendHealthcheckPing.calledOnce).to.be.true;
      expect(mockSendHealthcheckPing.calledWith("https://example.com")).to.be
        .true;
    });

    it("should handle undefined url", async () => {
      collector = new SendHealthcheckPingCollector(
        2,
        undefined,
        mockSendHealthcheckPing
      );

      await collector.sendHealthcheckPing(0)();
      await collector.sendHealthcheckPing(1)();

      expect(mockSendHealthcheckPing.calledWith(undefined)).to.be.true;
    });

    it("should handle concurrent ping calls", async () => {
      collector = new SendHealthcheckPingCollector(
        3,
        "https://example.com",
        mockSendHealthcheckPing
      );

      const { ping0, ping1, ping2 } = makePings(collector);

      const promises = [ping0(), ping1(), ping2()];

      await Promise.all(promises);

      expect(mockSendHealthcheckPing.callCount).to.equal(1);
      expect(collector["sentPings"]).to.deep.equal([false, false, false]);
    });

    it("should handle callback rejection", async () => {
      const error = new Error("Callback failed");
      mockSendHealthcheckPing.rejects(error);

      collector = new SendHealthcheckPingCollector(
        2,
        "https://example.com",
        mockSendHealthcheckPing
      );

      await collector.sendHealthcheckPing(0)();

      try {
        await collector.sendHealthcheckPing(1)();
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect((err as Error).message).to.equal("Callback failed");
      }

      // Verify that pings were still reset
      expect(collector["sentPings"]).to.deep.equal([false, false]);
    });
  });

  function makePings(collector: SendHealthcheckPingCollector) {
    const ping0 = collector.sendHealthcheckPing(0);
    const ping1 = collector.sendHealthcheckPing(1);
    const ping2 = collector.sendHealthcheckPing(2);

    return { ping0, ping1, ping2 };
  }
});
