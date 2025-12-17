/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CostEstimation } from './CostEstimation';
/**
 * [docs-entry-end: HashingSchemeVersion]
 */
export type JsPrepareSubmissionResponse = {
    /**
     * The interpreted transaction, it represents the ledger changes necessary to execute the commands specified in the request.
     * Clients MUST display the content of the transaction to the user for them to validate before signing the hash if the preparing participant is not trusted.
     */
    preparedTransaction?: string;
    /**
     * Hash of the transaction, this is what needs to be signed by the party to authorize the transaction.
     * Only provided for convenience, clients MUST recompute the hash from the raw transaction if the preparing participant is not trusted.
     * May be removed in future versions
     */
    preparedTransactionHash: string;
    /**
     * The hashing scheme version used when building the hash
     */
    hashingSchemeVersion: JsPrepareSubmissionResponse.hashingSchemeVersion;
    /**
     * Optional additional details on how the transaction was encoded and hashed. Only set if verbose_hashing = true in the request
     * Note that there are no guarantees on the stability of the format or content of this field.
     * Its content should NOT be parsed and should only be used for troubleshooting purposes.
     */
    hashingDetails?: string;
    /**
     * Traffic cost estimation of the prepared transaction
     * Optional
     */
    costEstimation?: CostEstimation;
};
export namespace JsPrepareSubmissionResponse {
    /**
     * The hashing scheme version used when building the hash
     */
    export enum hashingSchemeVersion {
        HASHING_SCHEME_VERSION_UNSPECIFIED = 'HASHING_SCHEME_VERSION_UNSPECIFIED',
        HASHING_SCHEME_VERSION_V2 = 'HASHING_SCHEME_VERSION_V2',
    }
}

