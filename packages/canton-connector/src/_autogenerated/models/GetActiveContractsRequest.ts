/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventFormat } from './EventFormat';
import type { TransactionFilter } from './TransactionFilter';
/**
 * If the given offset is different than the ledger end, and there are (un)assignments in-flight at the given offset,
 * the snapshot may fail with "FAILED_PRECONDITION/PARTICIPANT_PRUNED_DATA_ACCESSED".
 * Note that it is ok to request acs snapshots for party migration with offsets other than ledger end, because party
 * migration is not concerned with incomplete (un)assignments.
 */
export type GetActiveContractsRequest = {
    /**
     * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
     * Templates to include in the served snapshot, per party.
     * Optional, if specified event_format must be unset, if not specified event_format must be set.
     */
    filter?: TransactionFilter;
    /**
     * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
     * If enabled, values served over the API will contain more information than strictly necessary to interpret the data.
     * In particular, setting the verbose flag to true triggers the ledger to include labels for record fields.
     * Optional, if specified event_format must be unset.
     */
    verbose: boolean;
    /**
     * The offset at which the snapshot of the active contracts will be computed.
     * Must be no greater than the current ledger end offset.
     * Must be greater than or equal to the last pruning offset.
     * Required, must be a valid absolute offset (positive integer) or ledger begin offset (zero).
     * If zero, the empty set will be returned.
     */
    activeAtOffset: number;
    /**
     * Format of the contract_entries in the result. In case of CreatedEvent the presentation will be of
     * TRANSACTION_SHAPE_ACS_DELTA.
     * Optional for backwards compatibility, defaults to an EventFormat where:
     *
     * - filters_by_party is the filter.filters_by_party from this request
     * - filters_for_any_party is the filter.filters_for_any_party from this request
     * - verbose is the verbose field from this request
     */
    eventFormat?: EventFormat;
};

