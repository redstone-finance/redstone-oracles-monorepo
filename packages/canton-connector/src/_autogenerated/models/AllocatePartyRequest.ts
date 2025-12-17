/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObjectMeta } from './ObjectMeta';
/**
 * Required authorization: ``HasRight(ParticipantAdmin) OR IsAuthenticatedIdentityProviderAdmin(identity_provider_id)``
 */
export type AllocatePartyRequest = {
    /**
     * A hint to the participant which party ID to allocate. It can be
     * ignored.
     * Must be a valid PartyIdString (as described in ``value.proto``).
     * Optional
     */
    partyIdHint: string;
    /**
     * Formerly "display_name"
     * Participant-local metadata to be stored in the ``PartyDetails`` of this newly allocated party.
     * Optional
     */
    localMetadata?: ObjectMeta;
    /**
     * The id of the ``Identity Provider``
     * Optional, if not set, assume the party is managed by the default identity provider or party is not hosted by the participant.
     */
    identityProviderId: string;
    /**
     * The synchronizer, on which the party should be allocated.
     * For backwards compatibility, this field may be omitted, if the participant is connected to only one synchronizer.
     * Otherwise a synchronizer must be specified.
     * Optional
     */
    synchronizerId: string;
    /**
     * The user who will get the act_as rights to the newly allocated party.
     * If set to an empty string (the default), no user will get rights to the party.
     * Optional
     */
    userId: string;
};

