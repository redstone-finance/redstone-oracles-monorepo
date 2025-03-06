import { ValueKind } from "@radixdlt/radix-engine-toolkit";
import { BigNumber } from "ethers";
import { arrayify } from "ethers/lib/utils";
import { RadixParser } from "../src/radix/parser/RadixParser";
import {
  expectArray,
  expectToBe,
  expectTupleOfBigIntAndArray,
  expectTupleOfBigIntAndTwoInts,
  expectU256Digits,
  expectValue,
  u256Digits,
} from "./expect";

describe("RadixParser tests", () => {
  it("should decode getPrices SBOR response with hex values", async () => {
    const result = await RadixParser.decodeSborHex(
      "5c21020a90d4838e91010000200c020c3078334644354338314238450d30783543464543394630413538"
    );
    const timestamp = 1724672890000n;
    const priceValues = ["0x3FD5C81B8E", "0x5CFEC9F0A58"];

    const values = expectTupleOfBigIntAndArray(
      result,
      timestamp,
      ValueKind.String
    );
    expect(values.map((value) => value.value)).toStrictEqual(priceValues);

    expect(RadixParser.extractValue(result)).toStrictEqual([
      timestamp,
      priceValues,
    ]);
  });

  it("should decode getPrices SBOR response with Bytes values", async () => {
    const result = await RadixParser.decodeSborHex(
      "5c21020ab095bc6695010000202003072000000000000000000000000000000000000000000000000000000032e32c08c6072000000000000000000000000000000000000000000000000000000819ea69b200072000000000000000000000000000000000000000000000000000000000000d6358"
    );
    const timestamp = 1741185390000n;
    const priceValues = [218559678662n, 8907400000000n, 877400n];

    const values = expectTupleOfBigIntAndArray(
      result,
      timestamp,
      ValueKind.Blob
    );

    expect(values.map((value) => BigNumber.from(value.value))).toStrictEqual(
      priceValues.map((value) => BigNumber.from(value))
    );

    expect(RadixParser.extractValue(result)).toStrictEqual([
      timestamp,
      priceValues.map(BigNumber.from),
    ]);
  });

  it("should decode getPrices SBOR response with Value(Bytes) values", async () => {
    const result = await RadixParser.decodeSborHex(
      "5c21020af01dd26a9501000020210301200720000000000000000000000000000000000000000000000000000000352fd7b036012007200000000000000000000000000000000000000000000000000000083fe1a326830120072000000000000000000000000000000000000000000000000000000000000d6b70"
    );
    const timestamp = 1741253910000n;
    const priceValues = [228435931190n, 9070461527683n, 879472n];

    const values = expectTupleOfBigIntAndArray(
      result,
      timestamp,
      ValueKind.Tuple
    );

    expect(
      values.map((value) => {
        expectToBe(value, ValueKind.Tuple);
        expectToBe(value.fields[0], ValueKind.Blob);
        return BigNumber.from(value.fields[0].value);
      })
    ).toStrictEqual(priceValues.map((value) => BigNumber.from(value)));

    expect(RadixParser.extractValue(result)).toStrictEqual([
      timestamp,
      priceValues.map(BigNumber.from),
    ]);
  });

  it("should decode getPrices SBOR response with U256-digits values", async () => {
    const result = await RadixParser.decodeSborHex(
      "5c21020a70832194910100002020020a04c06310cb3c0000000000000000000000000000000000000000000000000000000a0410a9e1b5a9050000000000000000000000000000000000000000000000000000"
    );
    const timestamp = 1724767110000n;
    const priceValues = [261104886720n, 6226459076880n];

    const values = expectTupleOfBigIntAndArray(
      result,
      timestamp,
      ValueKind.Array
    );

    expect(values.map((value) => value.elements)).toStrictEqual(
      priceValues.map(u256Digits)
    );

    expect(RadixParser.extractValue(result)).toStrictEqual([
      timestamp,
      priceValues.map(BigNumber.from),
    ]);
  });

  it("should decode getPriceData SBOR response", async () => {
    const result = await RadixParser.decodeSborHex(
      "5c20210303200a040096ad80590000000000000000000000000000000000000000000000000000000a00db55da930100000a100256da9301000003200a046484b3a5740900000000000000000000000000000000000000000000000000000a00db55da930100000a100256da9301000003200a04c6f72b00000000000000000000000000000000000000000000000000000000000a00db55da930100000a100256da93010000"
    );
    const prices = [384410949120n, 10396600861796n, 2881478n];
    const timestamp = 1734534880000n;
    const blockTimestamp = 1734534890000n;

    const priceData = expectArray(result, ValueKind.Tuple);
    prices.forEach((price, index) =>
      expectTupleOfBigIntAndTwoInts(
        priceData[index],
        price,
        timestamp,
        blockTimestamp
      )
    );

    const priceDataObj = RadixParser.extractValue(result);
    expect(priceDataObj).toStrictEqual(
      prices.map(BigNumber.from).map((price) => {
        return [price, timestamp, blockTimestamp];
      })
    );
  });

  it("should decode instantiate SBOR response", async () => {
    const result = await RadixParser.decodeSborHex(
      "5c80c0eb30370cafa2b014b880b80e602470b48ec19d01ee74ac5c603f4f0347"
    );

    expectValue(
      result,
      ValueKind.String,
      "component_tdx_2_1cr4nqdcv473tq99cszuqucpywz6gasvaq8h8ftzuvql57q684j8xur"
    );
  });

  it("should parse state fields", () => {
    const json =
      '[{"kind":"U8","field_name":"signer_count_threshold","value":"1"},{"kind":"Array","field_name":"signers","element_kind":"Array","elements":[{"kind":"Bytes","element_kind":"U8","hex":"12470f7aba85c8b81d63137dd5925d6ee114952b"},{"kind":"Bytes","element_kind":"U8","hex":"109b4a318a4f5ddcbca6349b45f881b4137deafb"},{"kind":"Bytes","element_kind":"U8","hex":"1ea62d73edf8ac05dfcea1a34b9796e937a29eff"},{"kind":"Bytes","element_kind":"U8","hex":"2c59617248994d12816ee1fa77ce0a64eeb456bf"},{"kind":"Bytes","element_kind":"U8","hex":"83cba8c619fb629b81a65c2e67fe15cf3e3c9747"},{"kind":"Bytes","element_kind":"U8","hex":"f786a909d559f5dee2dc6706d8e5a81728a39ae9"}]},{"kind":"Map","field_name":"prices","key_kind":"Array","value_kind":"Array","entries":[{"key":{"kind":"Array","element_kind":"U64","elements":[{"kind":"U64","value":"4346947"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"}]},"value":{"kind":"Array","element_kind":"U64","elements":[{"kind":"U64","value":"5910281962996"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"}]}},{"key":{"kind":"Array","element_kind":"U64","elements":[{"kind":"U64","value":"4543560"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"}]},"value":{"kind":"Array","element_kind":"U64","elements":[{"kind":"U64","value":"246120063046"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"},{"kind":"U64","value":"0"}]}}]},{"kind":"U64","field_name":"timestamp","value":"1724834030000"}]';
    const signerCountThreshold = 1;
    const timestamp = 1724834030000n;
    const btcPrice = 5910281962996n;
    const ethPrice = 246120063046n;
    const signerValues = [
      "12470f7aba85c8b81d63137dd5925d6ee114952b",
      "109b4a318a4f5ddcbca6349b45f881b4137deafb",
      "1ea62d73edf8ac05dfcea1a34b9796e937a29eff",
      "2c59617248994d12816ee1fa77ce0a64eeb456bf",
      "83cba8c619fb629b81a65c2e67fe15cf3e3c9747",
      "f786a909d559f5dee2dc6706d8e5a81728a39ae9",
    ].map((value) => arrayify("0x" + value));

    const obj = JSON.parse(json) as unknown[];
    const result = obj.map(RadixParser.makeManifestValue);

    expect(result.length).toBe(obj.length);
    expectValue(result[0], ValueKind.U8, signerCountThreshold);

    const signers = expectArray(result[1], ValueKind.Blob);

    expect(signers.map((value) => value.value)).toStrictEqual(signerValues);
    expectToBe(result[2], ValueKind.Map);
    const values = result[2];

    const btc = values.entries[0];
    const eth = values.entries[1];

    expectU256Digits(btc.key, 4346947n);
    expectU256Digits(btc.value, btcPrice);
    expectU256Digits(eth.key, 4543560n);
    expectU256Digits(eth.value, ethPrice);

    expectValue(result[3], ValueKind.U64, timestamp);

    expect(result.map((res) => RadixParser.extractValue(res))).toStrictEqual([
      signerCountThreshold,
      signerValues,
      {
        "0x425443": BigNumber.from(btcPrice),
        "0x455448": BigNumber.from(ethPrice),
      },
      timestamp,
    ]);
  });
});
