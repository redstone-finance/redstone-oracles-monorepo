/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Required authorization: ``HasRight(ParticipantAdmin)``
 */
export type UpdateUserIdentityProviderIdRequest = {
    /**
     * User to update
     */
    userId: string;
    /**
     * Current identity provider ID of the user
     */
    sourceIdentityProviderId: string;
    /**
     * Target identity provider ID of the user
     */
    targetIdentityProviderId: string;
};

