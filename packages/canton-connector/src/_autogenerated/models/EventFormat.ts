/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filters } from './Filters';
import type { Map_Filters } from './Map_Filters';
/**
 * A format for events which defines both which events should be included
 * and what data should be computed and included for them.
 *
 * Note that some of the filtering behavior depends on the `TransactionShape`,
 * which is expected to be specified alongside usages of `EventFormat`.
 */
export type EventFormat = {
    /**
     * Each key must be a valid PartyIdString (as described in ``value.proto``).
     * The interpretation of the filter depends on the transaction-shape being filtered:
     *
     * 1. For **ledger-effects** create and exercise events are returned, for which the witnesses include at least one of
     * the listed parties and match the per-party filter.
     * 2. For **transaction and active-contract-set streams** create and archive events are returned for all contracts whose
     * stakeholders include at least one of the listed parties and match the per-party filter.
     *
     * Optional
     */
    filtersByParty: Map_Filters;
    /**
     * Wildcard filters that apply to all the parties existing on the participant. The interpretation of the filters is the same
     * with the per-party filter as described above.
     * Optional
     */
    filtersForAnyParty?: Filters;
    /**
     * If enabled, values served over the API will contain more information than strictly necessary to interpret the data.
     * In particular, setting the verbose flag to true triggers the ledger to include labels for record fields.
     * Optional
     */
    verbose: boolean;
};

