/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Estimation of re-assignment costs
 * This is the cost of re-assigning contracts from another synchronizer if necessary.
 */
export type ReassignmentCost = {
    /**
     * The synchronizer the contracts are currently assigned to, and against whose traffic balance
     * the unassignment cost is charged
     *
     * Required
     */
    sourceSynchronizerId: string;
    /**
     * The synchronizer the contracts will be re-assigned to, and against whose traffic balance
     * the assignment cost is charged
     *
     * Required
     */
    targetSynchronizerId: string;
    /**
     * The contracts that will be unassigned together in this single unassignment request
     *
     * Required: must be non-empty
     */
    contractIds: Array<string>;
    /**
     * Estimated traffic cost of the unassignment confirmation request
     *
     * Required
     */
    unassignmentRequestTrafficCostEstimation: number;
    /**
     * Estimated traffic cost of the unassignment confirmation response
     *
     * Required
     */
    unassignmentResponseTrafficCostEstimation: number;
    /**
     * Estimated traffic cost of the assignment confirmation request
     *
     * Required
     */
    assignmentRequestTrafficCostEstimation: number;
    /**
     * Estimated traffic cost of the assignment confirmation response
     *
     * Required
     */
    assignmentResponseTrafficCostEstimation: number;
    /**
     * Sum of the fields above
     *
     * Required
     */
    totalReassignmentCostEstimation: number;
};

