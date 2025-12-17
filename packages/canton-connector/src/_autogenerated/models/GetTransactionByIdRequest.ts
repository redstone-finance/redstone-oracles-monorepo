/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TransactionFormat } from './TransactionFormat';
/**
 * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
 */
export type GetTransactionByIdRequest = {
    /**
     * The ID of a particular transaction.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    updateId: string;
    /**
     * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
     * The parties whose events the client expects to see.
     * Events that are not visible for the parties in this collection will not be present in the response.
     * Each element must be a valid PartyIdString (as described in ``value.proto``).
     * Optional for backwards compatibility for GetTransactionById request: if defined transaction_format must be
     * unset (falling back to defaults).
     */
    requestingParties?: Array<string>;
    /**
     * Optional for GetTransactionById request for backwards compatibility: defaults to a transaction_format, where:
     *
     * - event_format.filters_by_party will have template-wildcard filters for all the requesting_parties
     * - event_format.filters_for_any_party is unset
     * - event_format.verbose = true
     * - transaction_shape = TRANSACTION_SHAPE_ACS_DELTA
     */
    transactionFormat?: TransactionFormat;
};

