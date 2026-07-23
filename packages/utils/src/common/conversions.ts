import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import Decimal from "decimal.js";

export const bignumberishToDecimal = (value: BigNumberish) =>
  new Decimal(BigNumber.from(value).toHexString());
