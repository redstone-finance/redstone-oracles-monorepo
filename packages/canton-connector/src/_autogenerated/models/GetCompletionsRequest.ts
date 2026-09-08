/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GetCompletionsRequest = {
    /**
     * If specified, only completions of commands are included, which have at least one of the ``act_as`` parties
     * in the given set of parties.
     * Only Ledger API users with CanReadAsAnyParty permission allowed to provide no ``parties``.
     * Must be a valid PartyIdString (as described in ``value.proto``).
     *
     * Optional: can be empty
     */
    parties?: Array<string>;
    /**
     * This optional field indicates the minimum offset for completions. This can be used to resume an earlier completion stream.
     * If not set the ledger uses the ledger begin offset instead.
     * If specified, it must be a valid absolute offset (positive integer) or zero (ledger begin offset).
     * If the ledger has been pruned, this parameter must be specified and greater than the pruning offset. (the pruning
     * offset is accessible on the StateService.GetLatestPrunedOffsets endpoint)
     *
     * Optional
     */
    beginExclusive?: number;
};

