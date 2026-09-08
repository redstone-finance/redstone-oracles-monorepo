/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventFormat } from './EventFormat';
export type GetActiveContractsPageRequest = {
    /**
     * The offset at which the snapshot of the active contracts will be computed.
     * Must be no greater than the current ledger end offset.
     * Must be greater than or equal to the last pruning offset.
     * Optional, if defined, it must be a valid absolute offset (positive integer) or ledger begin offset (zero).
     * If zero, the empty set will be returned.
     * If not defined, the current ledger end will be used and it will be populated in the response.
     *
     * Optional
     */
    activeAtOffset?: number;
    /**
     * Format of the contract_entries in the result. In case of CreatedEvent the presentation will be of
     * TRANSACTION_SHAPE_ACS_DELTA.
     *
     * Required
     */
    eventFormat: EventFormat;
    /**
     * The result page will contain at most max_page_size entries of the respective active contract snapshot.
     * The server might reject max_page_size breaching the server-specified limit.
     * Optional, if not defined, the default will be determined by the server.
     *
     * Optional
     */
    maxPageSize?: number;
    /**
     * To get the next page of the active contracts snapshot, the ``page_token`` should be set to the
     * ``next_page_token`` of the last ``GetActiveContractsPageResponse``.
     * The page token only works if subsequent requests:
     *
     * - are executed on the same participant,
     * - use the same active_at_offset and event_format,
     * - and the participant's store was not pruned to after the active_at_offset.
     *
     * If not specified, the first page of the active contracts snapshot will be returned.
     *
     * Optional: can be empty
     */
    pageToken?: string;
};

