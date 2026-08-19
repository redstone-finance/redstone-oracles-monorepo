import { keccak256 } from "@ethersproject/keccak256";
import { sha256 as sha256Ethers } from "@ethersproject/sha2";
import { BytesLike } from "../common";

export const sha256ToHex = (data: BytesLike): string => sha256Ethers(data);

export const keccak256ToHex = (data: BytesLike): string => keccak256(data);
