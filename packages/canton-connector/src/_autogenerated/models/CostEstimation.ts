/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Estimation of the cost of submitting the prepared transaction
 * The estimation is done against the synchronizer chosen during preparation of the transaction
 * (or the one explicitly requested).
 * The cost of re-assigning contracts to another synchronizer when necessary is not included in the estimation.
 */
export type CostEstimation = {
    /**
     * Timestamp at which the estimation was made
     */
    estimationTimestamp?: string;
    /**
     * Estimated traffic cost of the confirmation request associated with the transaction
     */
    confirmationRequestTrafficCostEstimation: number;
    /**
     * Estimated traffic cost of the confirmation response associated with the transaction
     * This field can also be used as an indication of the cost that other potential confirming nodes
     * of the party will incur to approve or reject the transaction
     */
    confirmationResponseTrafficCostEstimation: number;
    /**
     * Sum of the fields above
     */
    totalTrafficCostEstimation: number;
};

