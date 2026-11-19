/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UpdateFormat } from './UpdateFormat';
export type GetUpdatesRequest = {
    /**
     * Exclusive lower bound offset of the requested ledger section (non-negative integer).
     * The response will only contain transactions whose offset is strictly greater than this.
     * If set to zero, the lower bound is set to the beginning of the ledger.
     * If the participant has been pruned, this parameter must be greater or equal than the pruning offset.
     * Required
     */
    beginExclusive: number;
    /**
     * Inclusive higher bound offset of the requested ledger section.
     * If specified the response will only contain transactions whose offset is less than or equal to this.
     * If not specified,
     *
     * - the descending_order must not be selected,
     * - the stream will not terminate.
     *
     * Optional
     */
    endInclusive?: number;
    /**
     * The update format for this request
     *
     * Required
     */
    updateFormat: UpdateFormat;
    /**
     * If set, the stream will populate the elements in descending order.
     *
     * Optional
     */
    descendingOrder?: boolean;
};

