import express from "express";
import { Consola } from "consola";
import { ethers } from "ethers";
import axios from "axios";
import jp from "jsonpath";
import { utils } from "redstone-protocol";
import { DataPackage, NumericDataPoint } from "redstone-protocol";
import { fromBase64 } from "../utils/base64";
import { NodeConfig } from "../types";
import { stringifyError } from "../utils/error-stringifier";

const QUERY_PARAM_NAME = "custom-url-request-config-base64";
const DEFAULT_TIMEOUT_MILLISECONDS = 10000;
const logger = require("../utils/logger")(
  "custom-url-requests-route"
) as Consola;

export default function (app: express.Application, nodeConfig: NodeConfig) {
  app.get("/custom-url-requests", async (req, res) => {
    try {
      // Parsing request details
      const customRequestConfig = parseCustomUrlDetails(
        req.query[QUERY_PARAM_NAME] as string
      );
      const { url, jsonpath } = customRequestConfig;

      // Sending the request
      logger.info(`Fetching data from custom url: ${url}`);
      const response = await axios.get(url, {
        timeout: DEFAULT_TIMEOUT_MILLISECONDS,
      });
      const fetchedData = response.data;
      logger.info(
        `Fetched data from url: ${url}: ${JSON.stringify(fetchedData)}`
      );

      // Extracting value
      logger.info(`Extracting data using jsonpath: ${jsonpath}`);
      const extractedValueArr = jp.query(fetchedData, jsonpath);
      if (extractedValueArr.length !== 1) {
        throw new Error(`Extracted value must be a single number`);
      }
      const extractedValue = extractedValueArr[0];
      if (isNaN(extractedValue)) {
        throw new Error(`Extracted value is not a number: ${extractedValue}`);
      }

      // Preparing a signed data package
      const timestamp = Date.now();
      const symbol = getSymbol({ url, jsonpath });
      const dataPoint = new NumericDataPoint({
        symbol,
        value: extractedValue,
      });
      const dataPackage = new DataPackage([dataPoint], timestamp);
      const signedDataPackage = dataPackage.sign(
        nodeConfig.privateKeys.ethereumPrivateKey
      );
      const parsedSignedDataPackage = signedDataPackage.toObj();

      const dataPackageToBroadcast = {
        ...parsedSignedDataPackage,
        customRequestConfig,
      };

      // Sending response
      return res.json(dataPackageToBroadcast);
    } catch (e) {
      const errText = stringifyError(e);
      // TODO: improve error catching later:
      // differentiate types of errors and
      // use appropriate HTTP error codes
      res.status(400).json({
        err: errText,
      });
    }
  });
}

function parseCustomUrlDetails(customRequestParamBase64: string) {
  const stringifiedConfig = fromBase64(customRequestParamBase64);
  return JSON.parse(stringifiedConfig);
}

function getSymbol(customRequestConfig: { url: string; jsonpath: string }) {
  const { url, jsonpath } = customRequestConfig;
  return ethers.utils.id(`${jsonpath}---${url}`).slice(0, 18);
}
