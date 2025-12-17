/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ConnectedSynchronizer = {
    synchronizerAlias: string;
    synchronizerId: string;
    permission: ConnectedSynchronizer.permission;
};
export namespace ConnectedSynchronizer {
    export enum permission {
        PARTICIPANT_PERMISSION_UNSPECIFIED = 'PARTICIPANT_PERMISSION_UNSPECIFIED',
        PARTICIPANT_PERMISSION_SUBMISSION = 'PARTICIPANT_PERMISSION_SUBMISSION',
        PARTICIPANT_PERMISSION_CONFIRMATION = 'PARTICIPANT_PERMISSION_CONFIRMATION',
        PARTICIPANT_PERMISSION_OBSERVATION = 'PARTICIPANT_PERMISSION_OBSERVATION',
    }
}

