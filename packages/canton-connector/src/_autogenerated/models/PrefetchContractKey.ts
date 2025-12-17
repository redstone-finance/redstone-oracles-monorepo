/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Preload contracts
 */
export type PrefetchContractKey = {
    /**
     * The template of contract the client wants to prefetch.
     * Both package-name and package-id reference identifier formats for the template-id are supported.
     * Note: The package-id reference identifier format is deprecated. We plan to end support for this format in version 3.4.
     *
     * Required
     */
    templateId?: string;
    /**
     * The key of the contract the client wants to prefetch.
     * Required
     */
    contractKey: any;
};

