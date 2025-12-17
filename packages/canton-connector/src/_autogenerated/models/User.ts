/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObjectMeta } from './ObjectMeta';
/**
 *  Users and rights
 * /////////////////
 * Users are used to dynamically manage the rights given to Daml applications.
 * They are stored and managed per participant node.
 */
export type User = {
    /**
     * The user identifier, which must be a non-empty string of at most 128
     * characters that are either alphanumeric ASCII characters or one of the symbols "@^$.!`-#+'~_|:".
     * Required
     */
    id: string;
    /**
     * The primary party as which this user reads and acts by default on the ledger
     * *provided* it has the corresponding ``CanReadAs(primary_party)`` or
     * ``CanActAs(primary_party)`` rights.
     * Ledger API clients SHOULD set this field to a non-empty value for all users to
     * enable the users to act on the ledger using their own Daml party.
     * Users for participant administrators MAY have an associated primary party.
     * Optional,
     * Modifiable
     */
    primaryParty: string;
    /**
     * When set, then the user is denied all access to the Ledger API.
     * Otherwise, the user has access to the Ledger API as per the user's rights.
     * Optional,
     * Modifiable
     */
    isDeactivated: boolean;
    /**
     * The metadata of this user.
     * Note that the ``metadata.resource_version`` tracks changes to the properties described by the ``User`` message and not the user's rights.
     * Optional,
     * Modifiable
     */
    metadata?: ObjectMeta;
    /**
     * The ID of the identity provider configured by ``Identity Provider Config``
     * Optional, if not set, assume the user is managed by the default identity provider.
     */
    identityProviderId: string;
};

