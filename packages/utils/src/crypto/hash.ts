import { BytesLike } from "@ethersproject/bytes";
import { sha256 as sha256Ethers } from "@ethersproject/sha2";

export const sha256ToHex = (data: BytesLike): string => sha256Ethers(data);
