/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SigningPublicKey } from './SigningPublicKey';
export type GenerateExternalPartyTopologyRequest = {
    /**
     * TODO(#27670) support synchronizer aliases
     * Required: synchronizer-id for which we are building this request.
     */
    synchronizer: string;
    /**
     * Required: the actual party id will be constructed from this hint and a fingerprint of the public key
     */
    partyHint: string;
    /**
     * Required: public key
     */
    publicKey?: SigningPublicKey;
    /**
     * Optional: if true, then the local participant will only be observing, not confirming. Default false.
     */
    localParticipantObservationOnly: boolean;
    /**
     * Optional: other participant ids which should be confirming for this party
     */
    otherConfirmingParticipantUids?: Array<string>;
    /**
     * Optional: Confirmation threshold >= 1 for the party. Defaults to all available confirmers (or if set to 0).
     */
    confirmationThreshold: number;
    /**
     * Optional: other observing participant ids for this party
     */
    observingParticipantUids?: Array<string>;
};

