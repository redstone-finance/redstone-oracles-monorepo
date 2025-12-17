/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Hints to improve cost estimation precision of a prepared transaction
 */
export type CostEstimationHints = {
    /**
     * Disable cost estimation
     * Default (not set) is false
     */
    disabled: boolean;
    /**
     * Details on the keys that will be used to sign the transaction (how many and of which type).
     * Signature size impacts the cost of the transaction.
     * If empty, the signature sizes will be approximated with threshold-many signatures (where threshold is defined
     * in the PartyToKeyMapping of the external party), using keys in the order they are registered.
     * Optional (empty list is equivalent to not providing this field)
     */
    expectedSignatures?: Array<'SIGNING_ALGORITHM_SPEC_UNSPECIFIED' | 'SIGNING_ALGORITHM_SPEC_ED25519' | 'SIGNING_ALGORITHM_SPEC_EC_DSA_SHA_256' | 'SIGNING_ALGORITHM_SPEC_EC_DSA_SHA_384'>;
};

