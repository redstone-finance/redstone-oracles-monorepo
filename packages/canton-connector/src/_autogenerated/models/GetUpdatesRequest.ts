/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TransactionFilter } from './TransactionFilter';
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
     * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
     * Requesting parties with template filters.
     * Template filters must be empty for GetUpdateTrees requests.
     * Optional for backwards compatibility, if defined update_format must be unset
     */
    filter?: TransactionFilter;
    /**
     * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
     * If enabled, values served over the API will contain more information than strictly necessary to interpret the data.
     * In particular, setting the verbose flag to true triggers the ledger to include labels, record and variant type ids
     * for record fields.
     * Optional for backwards compatibility, if defined update_format must be unset
     */
    verbose?: boolean;
    /**
     * Must be unset for GetUpdateTrees request.
     * Optional for backwards compatibility for GetUpdates request: defaults to an UpdateFormat where:
     *
     * - include_transactions.event_format.filters_by_party = the filter.filters_by_party on this request
     * - include_transactions.event_format.filters_for_any_party = the filter.filters_for_any_party on this request
     * - include_transactions.event_format.verbose = the same flag specified on this request
     * - include_transactions.transaction_shape = TRANSACTION_SHAPE_ACS_DELTA
     * - include_reassignments.filter = the same filter specified on this request
     * - include_reassignments.verbose = the same flag specified on this request
     * - include_topology_events.include_participant_authorization_events.parties = all the parties specified in filter
     */
    updateFormat?: UpdateFormat;
    /**
     * If set, the stream will populate the elements in descending order.
     *
     * Optional
     */
    descendingOrder?: boolean;
};

