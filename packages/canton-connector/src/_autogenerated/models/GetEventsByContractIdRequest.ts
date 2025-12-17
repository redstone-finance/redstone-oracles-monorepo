/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventFormat } from './EventFormat';
export type GetEventsByContractIdRequest = {
    /**
     * The contract id being queried.
     * Required
     */
    contractId: string;
    /**
     * Format of the events in the result, the presentation will be of TRANSACTION_SHAPE_ACS_DELTA.
     * Required
     */
    eventFormat?: EventFormat;
};

