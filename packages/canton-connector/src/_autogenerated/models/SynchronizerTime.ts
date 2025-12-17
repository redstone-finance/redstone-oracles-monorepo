/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SynchronizerTime = {
    /**
     * The id of the synchronizer.
     * Required
     */
    synchronizerId: string;
    /**
     * All commands with a maximum record time below this value MUST be considered lost if their completion has not arrived before this checkpoint.
     * Required
     */
    recordTime?: string;
};

