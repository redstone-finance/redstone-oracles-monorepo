/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Right } from './Right';
import type { User } from './User';
/**
 *  RPC requests and responses
 * ///////////////////////////
 * Required authorization: ``HasRight(ParticipantAdmin) OR IsAuthenticatedIdentityProviderAdmin(user.identity_provider_id)``
 */
export type CreateUserRequest = {
    /**
     * The user to create.
     * Required
     */
    user?: User;
    /**
     * The rights to be assigned to the user upon creation,
     * which SHOULD include appropriate rights for the ``user.primary_party``.
     * Optional
     */
    rights?: Array<Right>;
};

