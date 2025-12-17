/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Command } from './Command';
import type { CostEstimationHints } from './CostEstimationHints';
import type { DisclosedContract } from './DisclosedContract';
import type { MinLedgerTime } from './MinLedgerTime';
import type { PrefetchContractKey } from './PrefetchContractKey';
export type JsPrepareSubmissionRequest = {
    /**
     * Uniquely identifies the participant user that prepares the transaction.
     * Must be a valid UserIdString (as described in ``value.proto``).
     * Required unless authentication is used with a user token.
     * In that case, the token's user-id will be used for the request's user_id.
     * Optional
     */
    userId: string;
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
     * Individual elements of this atomic command. Must be non-empty.
     * Limitation: Only single command transaction are currently supported by the API.
     * The field is marked as repeated in preparation for future support of multiple commands.
     * Required
     */
    commands?: Array<Command>;
    /**
     * Optional
     */
    minLedgerTime?: MinLedgerTime;
    /**
     * Set of parties on whose behalf the command should be executed, if submitted.
     * If ledger API authorization is enabled, then the authorization metadata must authorize the sender of the request
     * to **read** (not act) on behalf of each of the given parties. This is because this RPC merely prepares a transaction
     * and does not execute it. Therefore read authorization is sufficient even for actAs parties.
     * Note: This may change, and more specific authorization scope may be introduced in the future.
     * Each element must be a valid PartyIdString (as described in ``value.proto``).
     * Required, must be non-empty.
     */
    actAs?: Array<string>;
    /**
     * Set of parties on whose behalf (in addition to all parties listed in ``act_as``) contracts can be retrieved.
     * This affects Daml operations such as ``fetch``, ``fetchByKey``, ``lookupByKey``, ``exercise``, and ``exerciseByKey``.
     * Note: A command can only use contracts that are visible to at least
     * one of the parties in ``act_as`` or ``read_as``. This visibility check is independent from the Daml authorization
     * rules for fetch operations.
     * If ledger API authorization is enabled, then the authorization metadata must authorize the sender of the request
     * to read contract data on behalf of each of the given parties.
     * Optional
     */
    readAs?: Array<string>;
    /**
     * Additional contracts used to resolve contract & contract key lookups.
     * Optional
     */
    disclosedContracts?: Array<DisclosedContract>;
    /**
     * Must be a valid synchronizer id
     * If not set, a suitable synchronizer that this node is connected to will be chosen
     * Optional
     */
    synchronizerId: string;
    /**
     * The package-id selection preference of the client for resolving
     * package names and interface instances in command submission and interpretation
     * Optional
     */
    packageIdSelectionPreference?: Array<string>;
    /**
     * When true, the response will contain additional details on how the transaction was encoded and hashed
     * This can be useful for troubleshooting of hash mismatches. Should only be used for debugging.
     * Optional, default to false
     */
    verboseHashing: boolean;
    /**
     * Fetches the contract keys into the caches to speed up the command processing.
     * Should only contain contract keys that are expected to be resolved during interpretation of the commands.
     * Keys of disclosed contracts do not need prefetching.
     *
     * Optional
     */
    prefetchContractKeys?: Array<PrefetchContractKey>;
    /**
     * Maximum timestamp at which the transaction can be recorded onto the ledger via the synchronizer specified in the `PrepareSubmissionResponse`.
     * If submitted after it will be rejected even if otherwise valid, in which case it needs to be prepared and signed again
     * with a new valid max_record_time.
     * Use this to limit the time-to-life of a prepared transaction,
     * which is useful to know when it can definitely not be accepted
     * anymore and resorting to preparing another transaction for the same
     * intent is safe again.
     * Optional
     */
    maxRecordTime?: string;
    /**
     * Hints to improve the accuracy of traffic cost estimation.
     * The estimation logic assumes that this node will be used for the execution of the transaction
     * If another node is used instead, the estimation may be less precise.
     * Request amplification is not accounted for in the estimation: each amplified request will
     * result in the cost of the confirmation request to be charged additionally.
     *
     * Optional - Traffic cost estimation is enabled by default if this field is not set
     * To turn off cost estimation, set the CostEstimationHints#disabled field to true
     */
    estimateTrafficCost?: CostEstimationHints;
};

