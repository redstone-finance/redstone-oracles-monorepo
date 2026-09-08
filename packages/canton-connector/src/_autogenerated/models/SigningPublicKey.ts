/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SigningPublicKey = {
    /**
     * The serialization format of the public key
     *
     * Required
     */
    format: string;
    /**
     * Serialized public key in the format specified above
     *
     * Required: must be non-empty
     */
    keyData: string;
    /**
     * The key specification
     *
     * Required
     */
    keySpec: string;
};

