/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Assign a contract
 */
export type AssignCommand1 = {
    /**
     * The ID from the unassigned event to be completed by this assignment.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    reassignmentId: string;
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

