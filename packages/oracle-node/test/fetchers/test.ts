const fs = require("fs");
import { DataPackage, NumericDataPoint } from "redstone-protocol";

(() => {
  const pathToExampleResponse = "../../src/fetchers/twap/example-response.json";
  const exampleResponse = require(pathToExampleResponse);
  const ECDSA_PRIVATE_KEY =
    "0x1111111111111111111111111111111111111111111111111111111111111111";

  const test: any[] = [];
  exampleResponse.forEach(
    (price: {
      symbol: string;
      value: number;
      timestamp: number;
      signature: string;
    }) => {
      console.log(price.symbol);
      console.log(price.value);
      const dataPoint = new NumericDataPoint({
        symbol: price.symbol,
        value: price.value,
        decimals: 18,
      });
      const dataPackage = new DataPackage([dataPoint], price.timestamp);
      const signedDataPackage = dataPackage.sign(ECDSA_PRIVATE_KEY);
      const signatureAsHex = signedDataPackage.serializeSignatureToHex();
      test.push({ ...price, signature: signatureAsHex });
    }
  );
  fs.writeFileSync(
    "../../src/fetchers/twap/example-response-1.json",
    JSON.stringify(test)
  );
})();
