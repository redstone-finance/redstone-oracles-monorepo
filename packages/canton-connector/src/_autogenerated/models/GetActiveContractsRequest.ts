/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventFormat } from './EventFormat';
export type GetActiveContractsRequest = {
    /**
     * The offset at which the snapshot of the active contracts will be computed.
     * Must be no greater than the current ledger end offset.
     * Must be greater than or equal to the last pruning offset.
     * Must be a valid absolute offset (positive integer) or ledger begin offset (zero).
     * If zero, the empty set will be returned.
     *
     * Required
     */
    activeAtOffset: number;
    /**
     * Format of the contract_entries in the result. In case of CreatedEvent the presentation will be of
     * TRANSACTION_SHAPE_ACS_DELTA.
     *
     * Required
     */
    eventFormat: EventFormat;
    /**
     * Opaque representation of a continuation token defining a position in the active contracts snapshot.
     * The prefix of the active contracts snapshot will be omitted up to and including the element from which
     * the continuation token was read.
     * To reuse the continuation token from a `GetActiveContractsPageResponse`:
     *
     * - subsequent request must be executed on the same participant with the same version of canton,
     * - subsequent request must have the same active_at_offset,
     * - subsequent request must have the same event_format,
     * - subsequent request must have the same include_incomplete_reassignments
     * - and the participant must not have been pruned after the active_at_offset.
     *
     * If not specified, the whole active contracts snapshot will be returned.
     *
     * Optional: can be empty
     */
    streamContinuationToken?: string;
    /**
     * If this flag is true, the IncompleteAssigned and IncompleteUnassigned events will be included in the stream
     * based on the specified event_format.
     * If this flag is set to false, Incomplete Reassignments will be omitted.
     *
     * Optional
     */
    includeIncompleteReassignments?: boolean;
};

