/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filters } from './Filters';
import type { Map_Filters } from './Map_Filters';
/**
 * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
 * Used both for filtering create and archive events as well as for filtering transaction trees.
 */
export type TransactionFilter = {
    /**
     * Each key must be a valid PartyIdString (as described in ``value.proto``).
     * The interpretation of the filter depends on the transaction-shape being filtered:
     *
     * 1. For **transaction trees** (used in GetUpdateTreesResponse for backwards compatibility) all party keys used as
     * wildcard filters, and all subtrees whose root has one of the listed parties as an informee are returned.
     * If there are ``CumulativeFilter``s, those will control returned ``CreatedEvent`` fields where applicable, but will
     * not be used for template/interface filtering.
     * 2. For **ledger-effects** create and exercise events are returned, for which the witnesses include at least one of
     * the listed parties and match the per-party filter.
     * 3. For **transaction and active-contract-set streams** create and archive events are returned for all contracts whose
     * stakeholders include at least one of the listed parties and match the per-party filter.
     */
    filtersByParty: Map_Filters;
    /**
     * Wildcard filters that apply to all the parties existing on the participant. The interpretation of the filters is the same
     * with the per-party filter as described above.
     */
    filtersForAnyParty?: Filters;
};

