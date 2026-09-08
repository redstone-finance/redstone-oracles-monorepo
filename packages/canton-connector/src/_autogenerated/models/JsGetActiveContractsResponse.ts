/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsContractEntry } from './JsContractEntry';
export type JsGetActiveContractsResponse = {
    /**
     * The workflow ID used in command submission which corresponds to the contract_entry. Only set if
     * the ``workflow_id`` for the command was set.
     * Must be a valid LedgerString (as described in ``value.proto``).
     *
     * Optional
     */
    workflowId?: string;
    contractEntry?: JsContractEntry;
    /**
     * Opaque representation of a continuation token which can be used in the request to bypass the already processed part
     * of the active contracts snapshot.
     * Only populated for the streaming ``GetActiveContracts`` rpc call.
     *
     * Optional: can be empty
     */
    streamContinuationToken?: string;
};

