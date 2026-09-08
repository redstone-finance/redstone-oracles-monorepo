/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UpdateFormat } from './UpdateFormat';
export type GetUpdatesPageRequest = {
    /**
     * Exclusive lower bound offset of the requested ledger section (non-negative integer).
     * The response page will only contain updates whose offset is strictly greater than this.
     * If set to zero or not defined, the lower bound is set to the actual pruning offset or to the beginning of the
     * ledger if the participant was not pruned yet.
     * If set to positive and the ledger has been pruned, this parameter must be greater or equal than the pruning offset.
     *
     * Optional
     */
    beginOffsetExclusive?: number;
    /**
     * Inclusive upper bound offset of the requested ledger section.
     * If specified the response will only contain updates whose offset is less than or equal to this.
     * If not specified response will only contain updates whose offset is less than the current ledger-end.
     *
     * Optional
     */
    endOffsetInclusive?: number;
    /**
     * The result page will contain the first max_page_size Updates of all matching updates.
     * The server may reject queries with max_page_size above server specified limits.
     * If not specified, the default max_page_size is determined by the server.
     *
     * Optional
     */
    maxPageSize?: number;
    /**
     * Required
     */
    updateFormat: UpdateFormat;
    /**
     * If set, the page will populate the elements in descending order starting from the end_offset_inclusive.
     *
     * Optional
     */
    descendingOrder?: boolean;
    /**
     * To get the next page of updates, the ``page_token`` should be set to the
     * ``next_page_token`` of the last ``GetUpdatesPageResponse``.
     * To achieve correct paging: subsequent requests must
     *
     * - be executed on the same participant,
     * - have the same begin_offset_exclusive,
     * - have the same end_offset_inclusive,
     * - have the same update_format and
     * - have the same descending_order.
     *
     * If not specified, the first page of updates will be returned.
     *
     * Optional: can be empty
     */
    pageToken?: string;
};

