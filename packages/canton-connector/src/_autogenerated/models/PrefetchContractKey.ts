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
    templateId: string;
    /**
     * The key of the contract the client wants to prefetch.
     *
     * Required
     */
    contractKey: any;
    /**
     * The number of contracts to prefetch for this key, if available.
     * This is in addition to disclosed contracts.
     * - for backward compatibility reason, absence is interpreted as 1
     * - 0 is forbidden
     * - capped at 2^31 - 1. The system may impose further limits.
     *
     * Optional
     */
    limit?: number;
};

