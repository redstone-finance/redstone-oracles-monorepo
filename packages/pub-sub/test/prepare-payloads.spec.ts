import { inflateSync } from "zlib";
import { preparePayloads } from "../src/prepare-payloads";
import { PubSubPayload } from "../src/PubSubClient";

describe("preparePayloads", () => {
  const payloads: PubSubPayload[] = [
    { topic: "data-package/svc/ETH/0xabc", data: { value: 3500.5, id: "ETH" } },
    { topic: "data-package/svc/BTC/0xabc", data: { value: 97000, id: "BTC" } },
  ];

  it("json matches JSON.stringify of data", () => {
    const prepared = preparePayloads(payloads, "deflate+json");

    for (const [i, payload] of prepared.entries()) {
      expect(payload.prepared!.json.toString("utf8")).toBe(JSON.stringify(payloads[i].data));
    }
  });

  it("serialized inflates back to json", () => {
    const prepared = preparePayloads(payloads, "deflate+json");

    for (const payload of prepared) {
      const inflated = inflateSync(payload.prepared!.serialized);

      expect(inflated.equals(payload.prepared!.json)).toBe(true);
      expect(JSON.parse(inflated.toString("utf8"))).toEqual(payload.data);
    }
  });

  it("keeps topic and data untouched", () => {
    const prepared = preparePayloads(payloads, "deflate+json");

    for (const [i, payload] of prepared.entries()) {
      expect(payload.topic).toBe(payloads[i].topic);
      expect(payload.data).toBe(payloads[i].data);
    }
  });

  it("records the contentType it serialized with", () => {
    const prepared = preparePayloads(payloads, "deflate+json");

    for (const payload of prepared) {
      expect(payload.prepared!.contentType).toBe("deflate+json");
    }
  });
});
