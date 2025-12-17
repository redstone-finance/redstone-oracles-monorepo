/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CompletionStreamRequest = {
    /**
     * Only completions of commands submitted with the same user_id will be visible in the stream.
     * Must be a valid UserIdString (as described in ``value.proto``).
     * Required unless authentication is used with a user token.
     * In that case, the token's user-id will be used for the request's user_id.
     */
    userId: string;
    /**
     * Non-empty list of parties whose data should be included.
     * The stream shows only completions of commands for which at least one of the ``act_as`` parties is in the given set of parties.
     * Must be a valid PartyIdString (as described in ``value.proto``).
     * Required
     */
    parties?: Array<string>;
    /**
     * This optional field indicates the minimum offset for completions. This can be used to resume an earlier completion stream.
     * If not set the ledger uses the ledger begin offset instead.
     * If specified, it must be a valid absolute offset (positive integer) or zero (ledger begin offset).
     * If the ledger has been pruned, this parameter must be specified and greater than the pruning offset.
     */
    beginExclusive: number;
};

