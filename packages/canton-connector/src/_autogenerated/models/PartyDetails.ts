/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObjectMeta } from './ObjectMeta';
export type PartyDetails = {
    /**
     * The stable unique identifier of a Daml party.
     * Must be a valid PartyIdString (as described in ``value.proto``).
     * Required
     */
    party: string;
    /**
     * true if party is hosted by the participant and the party shares the same identity provider as the user issuing the request.
     * Optional
     */
    isLocal: boolean;
    /**
     * Participant-local metadata of this party.
     * Optional,
     * Modifiable
     */
    localMetadata?: ObjectMeta;
    /**
     * The id of the ``Identity Provider``
     * Optional, if not set, there could be 3 options:
     *
     * 1. the party is managed by the default identity provider.
     * 2. party is not hosted by the participant.
     * 3. party is hosted by the participant, but is outside of the user's identity provider.
     */
    identityProviderId: string;
};

