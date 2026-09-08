/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CanExecuteAs1 = {
    /**
     * The right to prepare and execute submissions as this party.
     * This right does not entitle the user to perform any reads.
     * If reading is required, a separate ReadAs right must be added.
     * Right to execute as a party is also implicitly contained in the CanActAs right.
     *
     * Required
     */
    party: string;
};

