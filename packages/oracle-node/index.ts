import { Consola } from "consola";
import NodeRunner from "./src/NodeRunner";
import { config } from "./src/config";

const logger = require("./src/utils/logger")("index") as Consola;

async function start() {
  try {
    await main();
  } catch (e: any) {
    logger.error(e.stack);
    logger.info(
      "Please find details about the correct node running at https://github.com/redstone-finance/redstone-node/blob/main/docs/PREPARE_ENV_VARIABLES.md"
    );
  }
}

async function main(): Promise<void> {
  // Running RedStone node with manifest
  const runner = await NodeRunner.create(config);
  await runner.run();
}

start();

export = {};
