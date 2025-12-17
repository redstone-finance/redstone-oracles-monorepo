/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Unassign a contract
 */
export type UnassignCommand1 = {
    /**
     * The ID of the contract the client wants to unassign.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    contractId: string;
    /**
     * The ID of the source synchronizer
     * Must be a valid synchronizer id
     * Required
     */
    source: string;
    /**
     * The ID of the target synchronizer
     * Must be a valid synchronizer id
     * Required
     */
    target: string;
};

