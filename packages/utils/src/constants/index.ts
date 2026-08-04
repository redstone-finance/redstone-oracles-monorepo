import * as RedstoneCommon from "../common";

// CONSTANTS WHICH ARE NOT PART OF THE PROTOCOL BUT USED BY MORE THAN ONE PACKAGE

export const DEFAULT_LATEST_DATA_PACKAGES_MAX_DELAY_MS = RedstoneCommon.minToMs(1);

export const ADDRESS_ZERO = `0x${"0".repeat(40)}`;

export const HASH_ZERO = `0x${"0".repeat(64)}`;
