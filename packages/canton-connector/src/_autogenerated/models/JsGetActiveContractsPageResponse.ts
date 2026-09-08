/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsGetActiveContractsResponse } from './JsGetActiveContractsResponse';
export type JsGetActiveContractsPageResponse = {
    /**
     * The collection of active contracts for this page response.
     *
     * Required: must be non-empty
     */
    activeContracts: Array<JsGetActiveContractsResponse>;
    /**
     * The active_at_offset which was specified in the request, or the calculated active_at_offset from the actual
     * ledger end from at the evaluation of the request.
     *
     * Required
     */
    activeAtOffset: number;
    /**
     * If not present this is the last page. If present, this token must be used to get the next page.
     *
     * Optional: can be empty
     */
    nextPageToken?: string;
};

