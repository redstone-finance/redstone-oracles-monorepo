import { RedstoneCommon } from "@redstone-finance/utils";

export const isSecp256k1Native = () => {
  try {
    assertSecp256k1Native();
    return true;
  } catch (e) {
    console.log(RedstoneCommon.stringifyError(e));
    return false;
  }
};

/** Force loading native secp256k1 bindings. If this fails we have no native bindings available
 * This method can be used to make sure we use native bindings.
 */
export const assertSecp256k1Native = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- make it as portable as possible
  require("secp256k1/bindings");
};
