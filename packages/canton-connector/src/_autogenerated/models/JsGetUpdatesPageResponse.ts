/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsGetUpdateResponse } from './JsGetUpdateResponse';
export type JsGetUpdatesPageResponse = {
    /**
     * The first max_page_size updates that match the filter in the request.
     * In case descending_order was selected, the order of the updates is in reversed offset order.
     *
     * Optional: can be empty
     */
    updates?: Array<JsGetUpdateResponse>;
    /**
     * Represents the lower bound of this page.
     *
     * Required
     */
    lowestPageOffsetExclusive: number;
    /**
     * Represents the upper bound of the page.
     *
     * Required
     */
    highestPageOffsetInclusive: number;
    /**
     * If the value is not populated, this is the last page.
     * If the value is populated, this token can be used to get the next page.
     * If the original ``GetFirstUpdatePageRequest`` end_offset_inclusive was not specified and the request uses
     * ascending order, then this token will always be populated, so you can use it to "tail" the ledger by
     * repeatedly polling with the new page token returned.
     *
     * Optional: can be empty
     */
    nextPageToken?: string;
};

