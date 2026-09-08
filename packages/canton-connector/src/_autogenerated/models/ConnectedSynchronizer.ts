/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ConnectedSynchronizer = {
    /**
     * The alias of the synchronizer
     *
     * Required
     */
    synchronizerAlias: string;
    /**
     * The ID of the synchronizer
     *
     * Required
     */
    synchronizerId: string;
    /**
     * The permission on the synchronizer
     * Set if a party was used in the request, otherwise unspecified.
     *
     * Optional
     */
    permission?: ConnectedSynchronizer.permission;
};
export namespace ConnectedSynchronizer {
    /**
     * The permission on the synchronizer
     * Set if a party was used in the request, otherwise unspecified.
     *
     * Optional
     */
    export enum permission {
        PARTICIPANT_PERMISSION_UNSPECIFIED = 'PARTICIPANT_PERMISSION_UNSPECIFIED',
        PARTICIPANT_PERMISSION_SUBMISSION = 'PARTICIPANT_PERMISSION_SUBMISSION',
        PARTICIPANT_PERMISSION_CONFIRMATION = 'PARTICIPANT_PERMISSION_CONFIRMATION',
        PARTICIPANT_PERMISSION_OBSERVATION = 'PARTICIPANT_PERMISSION_OBSERVATION',
    }
}

