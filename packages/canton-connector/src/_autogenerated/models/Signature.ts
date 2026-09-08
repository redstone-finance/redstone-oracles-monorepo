/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Signature = {
    /**
     * Required
     */
    format: string;
    /**
     * Required: must be non-empty
     */
    signature: string;
    /**
     * The fingerprint/id of the keypair used to create this signature and needed to verify.
     *
     * Required
     */
    signedBy: string;
    /**
     * The signing algorithm specification used to produce this signature
     *
     * Required
     */
    signingAlgorithmSpec: string;
};

