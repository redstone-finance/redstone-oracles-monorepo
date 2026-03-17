/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GetContractRequest = {
    /**
     * The ID of the contract.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    contractId: string;
    /**
     * The list of querying parties
     * The stakeholders of the referenced contract must have an intersection with any of these parties
     * to return the result.
     * Optional, if no querying_parties specified, all possible contracts could be returned.
     */
    queryingParties?: Array<string>;
};

