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
     *
     * Required
     */
    userId: string;
    /**
     * Current identity provider ID of the user
     * If omitted, the default IDP is assumed
     *
     * Optional
     */
    sourceIdentityProviderId?: string;
    /**
     * Target identity provider ID of the user
     * If omitted, the default IDP is assumed
     *
     * Optional
     */
    targetIdentityProviderId?: string;
};

