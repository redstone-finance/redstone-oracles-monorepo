import { decodeTopic as decodeTopicToParts, encodeTopic } from "../src/topics";

const decodeTopic = (t: string) => decodeTopicToParts(t).join("/");

describe("topics", () => {
  describe("MQTT wildcards", () => {
    it("should preserve + and # wildcards without encoding", () => {
      expect(encodeTopic(["$SYS", "1", "+", "#"])).toEqual("$SYS/1/+/#");
      expect(decodeTopic(encodeTopic(["$SYS", "1", "+", "#"]))).toEqual("$SYS/1/+/#");
    });

    it("should encode + and # when embedded in a part", () => {
      expect(encodeTopic(["$SYS", "1", "2+", "#"])).toEqual("$SYS/1/2%2B/#");
      expect(decodeTopic(encodeTopic(["$SYS", "1", "2+", "#"]))).toEqual("$SYS/1/2+/#");
    });

    it("should encode $ when not at position 0", () => {
      expect(encodeTopic(["xd", "$", "+", "#"])).toEqual("xd/%24/+/#");
      expect(decodeTopic(encodeTopic(["xd", "$", "+", "#"]))).toEqual("xd/$/+/#");
    });

    it("should correctly encode and decode when a part contains '/'", () => {
      expect(encodeTopic(["xd", "A/B", "+", "#"])).toEqual("xd/A%2FB/+/#");
      expect(decodeTopic(encodeTopic(["xd", "A/B", "+", "#"]))).toEqual("xd/A/B/+/#");
      expect(decodeTopicToParts(encodeTopic(["xd", "A/B", "+", "#"]))).toEqual([
        "xd",
        "A/B",
        "+",
        "#",
      ]);
    });
  });

  describe("NATS wildcards", () => {
    it("should preserve * and > wildcards without encoding", () => {
      expect(encodeTopic(["prefix", "*", ">"])).toEqual("prefix/*/>");
      expect(decodeTopic(encodeTopic(["prefix", "*", ">"]))).toEqual("prefix/*/>");
    });

    it("should encode > when embedded in a part (encodeURIComponent leaves * unreserved)", () => {
      // encodeURIComponent does not encode *, so feed* stays as-is
      expect(encodeTopic(["prefix", "feed*", "end>"])).toEqual("prefix/feed*/end%3E");
      expect(decodeTopic(encodeTopic(["prefix", "feed*", "end>"]))).toEqual("prefix/feed*/end>");
    });

    it("should preserve standalone * wildcard for NATS single-token subscriptions", () => {
      expect(encodeTopic(["data-package", "service-1", "*", "0xABC"])).toEqual(
        "data-package/service-1/*/0xABC"
      );
      expect(decodeTopic(encodeTopic(["data-package", "service-1", "*", "0xABC"]))).toEqual(
        "data-package/service-1/*/0xABC"
      );
    });

    it("should preserve standalone > wildcard for NATS multi-token subscriptions", () => {
      expect(encodeTopic(["data-package", ">"])).toEqual("data-package/>");
      expect(decodeTopic(encodeTopic(["data-package", ">"]))).toEqual("data-package/>");
    });

    it("should encode . within a part so it survives NATS subject conversion", () => {
      // NATS uses '.' as separator — a '.' inside a part must be encoded
      expect(encodeTopic(["prefix", "feed.id"])).toEqual("prefix/feed%2Eid");
      expect(decodeTopic(encodeTopic(["prefix", "feed.id"]))).toEqual("prefix/feed.id");
    });
  });
});
