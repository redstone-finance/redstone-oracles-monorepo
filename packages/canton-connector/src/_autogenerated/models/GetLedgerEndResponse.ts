/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SynchronizerTime } from './SynchronizerTime';
export type GetLedgerEndResponse = {
    /**
     * It will always be a non-negative integer.
     * If zero, the participant view of the ledger is empty.
     * If positive, the absolute offset of the ledger as viewed by the participant.
     *
     * Optional
     */
    offset?: number;
    /**
     * Final record times observed by this participant for each of the requested synchronizers.
     * If there is no connection to a sequencer, corresponding record time can be arbitrarily far back in the past.
     *
     * Optional: can be empty
     */
    synchronizerTimes?: Array<SynchronizerTime>;
};

