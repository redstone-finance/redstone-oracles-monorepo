export function hexToU8Array(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export const makeFeedIdBytes = (feedId: string) => {
  return Buffer.from(feedId.padEnd(32, "\0"));
};

export const makePriceSeed = () => {
  return Buffer.from("price".padEnd(32, "\0"));
};
