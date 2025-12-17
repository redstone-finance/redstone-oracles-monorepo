/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SynchronizerTime } from './SynchronizerTime';
/**
 * OffsetCheckpoints may be used to:
 *
 * - detect time out of commands.
 * - provide an offset which can be used to restart consumption.
 */
export type OffsetCheckpoint1 = {
    /**
     * The participant's offset, the details of the offset field are described in ``community/ledger-api/README.md``.
     * Required, must be a valid absolute offset (positive integer).
     */
    offset: number;
    synchronizerTimes?: Array<SynchronizerTime>;
};

