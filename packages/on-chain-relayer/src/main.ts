import "dotenv/config";
// note: this line is intentional, otherwise linter changes the order of imports
// dotenv/config MUST be a very first import.

import { runRelayer } from "./run-relayer";

runRelayer();
