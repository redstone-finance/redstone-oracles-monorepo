/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Signature = {
    format: string;
    signature: string;
    /**
     * The fingerprint/id of the keypair used to create this signature and needed to verify.
     */
    signedBy: string;
    /**
     * The signing algorithm specification used to produce this signature
     */
    signingAlgorithmSpec: string;
};

