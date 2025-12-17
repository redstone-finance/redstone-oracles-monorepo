/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Command } from './Command';
import type { DeduplicationPeriod } from './DeduplicationPeriod';
import type { DisclosedContract } from './DisclosedContract';
import type { Duration } from './Duration';
import type { PrefetchContractKey } from './PrefetchContractKey';
/**
 * A composite command that groups multiple commands together.
 */
export type JsCommands = {
    /**
     * Individual elements of this atomic command. Must be non-empty.
     * Required
     */
    commands?: Array<Command>;
    /**
     * Uniquely identifies the command.
     * The triple (user_id, act_as, command_id) constitutes the change ID for the intended ledger change,
     * where act_as is interpreted as a set of party names.
     * The change ID can be used for matching the intended ledger changes with all their completions.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    commandId: string;
    /**
     * Set of parties on whose behalf the command should be executed.
     * If ledger API authorization is enabled, then the authorization metadata must authorize the sender of the request
     * to act on behalf of each of the given parties.
     * Each element must be a valid PartyIdString (as described in ``value.proto``).
     * Required, must be non-empty.
     */
    actAs?: Array<string>;
    /**
     * Uniquely identifies the participant user that issued the command.
     * Must be a valid UserIdString (as described in ``value.proto``).
     * Required unless authentication is used with a user token.
     * In that case, the token's user-id will be used for the request's user_id.
     */
    userId?: string;
    /**
     * Set of parties on whose behalf (in addition to all parties listed in ``act_as``) contracts can be retrieved.
     * This affects Daml operations such as ``fetch``, ``fetchByKey``, ``lookupByKey``, ``exercise``, and ``exerciseByKey``.
     * Note: A participant node of a Daml network can host multiple parties. Each contract present on the participant
     * node is only visible to a subset of these parties. A command can only use contracts that are visible to at least
     * one of the parties in ``act_as`` or ``read_as``. This visibility check is independent from the Daml authorization
     * rules for fetch operations.
     * If ledger API authorization is enabled, then the authorization metadata must authorize the sender of the request
     * to read contract data on behalf of each of the given parties.
     * Optional
     */
    readAs?: Array<string>;
    /**
     * Identifier of the on-ledger workflow that this command is a part of.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Optional
     */
    workflowId?: string;
    deduplicationPeriod?: DeduplicationPeriod;
    /**
     * Lower bound for the ledger time assigned to the resulting transaction.
     * Note: The ledger time of a transaction is assigned as part of command interpretation.
     * Use this property if you expect that command interpretation will take a considerate amount of time, such that by
     * the time the resulting transaction is sequenced, its assigned ledger time is not valid anymore.
     * Must not be set at the same time as min_ledger_time_rel.
     * Optional
     */
    minLedgerTimeAbs?: string;
    /**
     * Same as min_ledger_time_abs, but specified as a duration, starting from the time the command is received by the server.
     * Must not be set at the same time as min_ledger_time_abs.
     * Optional
     */
    minLedgerTimeRel?: Duration;
    /**
     * A unique identifier to distinguish completions for different submissions with the same change ID.
     * Typically a random UUID. Applications are expected to use a different UUID for each retry of a submission
     * with the same change ID.
     * Must be a valid LedgerString (as described in ``value.proto``).
     *
     * If omitted, the participant or the committer may set a value of their choice.
     * Optional
     */
    submissionId?: string;
    /**
     * Additional contracts used to resolve contract & contract key lookups.
     * Optional
     */
    disclosedContracts?: Array<DisclosedContract>;
    /**
     * Must be a valid synchronizer id
     * Optional
     */
    synchronizerId?: string;
    /**
     * The package-id selection preference of the client for resolving
     * package names and interface instances in command submission and interpretation
     */
    packageIdSelectionPreference?: Array<string>;
    /**
     * Fetches the contract keys into the caches to speed up the command processing.
     * Should only contain contract keys that are expected to be resolved during interpretation of the commands.
     * Keys of disclosed contracts do not need prefetching.
     *
     * Optional
     */
    prefetchContractKeys?: Array<PrefetchContractKey>;
};

