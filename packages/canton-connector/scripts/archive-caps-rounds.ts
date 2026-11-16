import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { CapsRoundArchiverCantonContractAdapter } from "../src/adapters/CapsRoundArchiverCantonContractAdapter";
import { makeDefaultClient, makePartyId } from "./utils";

const OPERATOR_PARTY_NAME = `RedStoneOracleUpdater`;
const UNTHROTTLED_INTERVAL_MS = 0;

async function main(definitionArg?: string, maxIterationsArg?: string, intervalMsArg?: string) {
  const client = makeDefaultClient();
  const definition = RedstoneCommon.assertThenReturn(
    definitionArg,
    "Pass the CAPS definition contract id as the first argument"
  );
  const maxIterations = z.coerce
    .number()
    .int()
    .nonnegative()
    .default(0)
    .transform((limit) => (limit === 0 ? Number.POSITIVE_INFINITY : limit))
    .parse(maxIterationsArg);
  const intervalMs = z.coerce.number().int().nonnegative().default(0).parse(intervalMsArg);
  const archiver = new CapsRoundArchiverCantonContractAdapter(
    client,
    makePartyId(OPERATOR_PARTY_NAME),
    UNTHROTTLED_INTERVAL_MS,
    definition
  );

  console.log(`Archiving CAPS rounds on ${client.network}`);

  await archiveAll(archiver, maxIterations, intervalMs);
}

async function archiveAll(
  archiver: CapsRoundArchiverCantonContractAdapter,
  maxIterations: number,
  intervalMs: number
) {
  let iteration = 0;
  do {
    if (iteration > 0) {
      await RedstoneCommon.sleep(intervalMs);
    }
    await archiver.run();
    iteration++;
  } while (iteration < maxIterations);

  console.log(`Archive process stopped after ${RedstoneCommon.getNS(iteration, "iteration")}`);
}

void main(process.argv[2], process.argv[3], process.argv[4]);
