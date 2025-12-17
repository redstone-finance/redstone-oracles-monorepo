/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ParticipantAuthorizationChanged1 = {
    /**
     * Required
     */
    partyId: string;
    /**
     * Required
     */
    participantId: string;
    /**
     * Required
     */
    participantPermission: ParticipantAuthorizationChanged1.participantPermission;
};
export namespace ParticipantAuthorizationChanged1 {
    /**
     * Required
     */
    export enum participantPermission {
        PARTICIPANT_PERMISSION_UNSPECIFIED = 'PARTICIPANT_PERMISSION_UNSPECIFIED',
        PARTICIPANT_PERMISSION_SUBMISSION = 'PARTICIPANT_PERMISSION_SUBMISSION',
        PARTICIPANT_PERMISSION_CONFIRMATION = 'PARTICIPANT_PERMISSION_CONFIRMATION',
        PARTICIPANT_PERMISSION_OBSERVATION = 'PARTICIPANT_PERMISSION_OBSERVATION',
    }
}

