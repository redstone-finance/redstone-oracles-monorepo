import { sha256 as sha256Ethers } from "@ethersproject/sha2";
import { BytesLike } from "../common";

export const sha256ToHex = (data: BytesLike): string => sha256Ethers(data);
