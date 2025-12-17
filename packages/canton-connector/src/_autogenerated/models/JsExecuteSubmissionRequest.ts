/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeduplicationPeriod2 } from './DeduplicationPeriod2';
import type { MinLedgerTime } from './MinLedgerTime';
import type { PartySignatures } from './PartySignatures';
export type JsExecuteSubmissionRequest = {
    /**
     * the prepared transaction
     * Typically this is the value of the `prepared_transaction` field in `PrepareSubmissionResponse`
     * obtained from calling `prepareSubmission`.
     * Required
     */
    preparedTransaction?: string;
    /**
     * The party(ies) signatures that authorize the prepared submission to be executed by this node.
     * Each party can provide one or more signatures..
     * and one or more parties can sign.
     * Note that currently, only single party submissions are supported.
     * Required
     */
    partySignatures?: PartySignatures;
    deduplicationPeriod: DeduplicationPeriod2;
    /**
     * A unique identifier to distinguish completions for different submissions with the same change ID.
     * Typically a random UUID. Applications are expected to use a different UUID for each retry of a submission
     * with the same change ID.
     * Must be a valid LedgerString (as described in ``value.proto``).
     *
     * Required
     */
    submissionId: string;
    /**
     * See [PrepareSubmissionRequest.user_id]
     * Optional
     */
    userId: string;
    /**
     * The hashing scheme version used when building the hash
     * Required
     */
    hashingSchemeVersion: JsExecuteSubmissionRequest.hashingSchemeVersion;
    /**
     * If set will influence the chosen ledger effective time but will not result in a submission delay so any override
     * should be scheduled to executed within the window allowed by synchronizer.
     * Optional
     */
    minLedgerTime?: MinLedgerTime;
};
export namespace JsExecuteSubmissionRequest {
    /**
     * The hashing scheme version used when building the hash
     * Required
     */
    export enum hashingSchemeVersion {
        HASHING_SCHEME_VERSION_UNSPECIFIED = 'HASHING_SCHEME_VERSION_UNSPECIFIED',
        HASHING_SCHEME_VERSION_V2 = 'HASHING_SCHEME_VERSION_V2',
    }
}

