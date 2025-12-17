/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Right } from './Right';
/**
 * Remove the rights from the set of rights granted to the user.
 *
 * Required authorization: ``HasRight(ParticipantAdmin) OR IsAuthenticatedIdentityProviderAdmin(identity_provider_id)``
 */
export type RevokeUserRightsRequest = {
    /**
     * The user from whom to revoke rights.
     * Required
     */
    userId: string;
    /**
     * The rights to revoke.
     * Optional
     */
    rights?: Array<Right>;
    /**
     * The id of the ``Identity Provider``
     * Optional, if not set, assume the user is managed by the default identity provider.
     */
    identityProviderId: string;
};

