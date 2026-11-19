/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SigningPublicKey } from './SigningPublicKey';
export type GenerateExternalPartyTopologyRequest = {
    /**
     * Synchronizer-id for which we are building this request.
     * TODO(#27670) support synchronizer aliases
     *
     * Required
     */
    synchronizer: string;
    /**
     * The actual party id will be constructed from this hint and a fingerprint of the public key
     *
     * Required
     */
    partyHint: string;
    /**
     * Public key
     *
     * Required
     */
    publicKey: SigningPublicKey;
    /**
     * If true, then the local participant will only be observing, not confirming. Default false.
     *
     * Optional
     */
    localParticipantObservationOnly?: boolean;
    /**
     * Other participant ids which should be confirming for this party
     *
     * Optional: can be empty
     */
    otherConfirmingParticipantUids?: Array<string>;
    /**
     * Confirmation threshold >= 1 for the party. Defaults to all available confirmers (or if set to 0).
     *
     * Optional
     */
    confirmationThreshold?: number;
    /**
     * Other observing participant ids for this party
     *
     * Optional: can be empty
     */
    observingParticipantUids?: Array<string>;
    /**
     * The protocol version to create the topology transactions for, so that clients that only read topology
     * transactions of an older protocol version can read them, e.g. 36 on a synchronizer with protocol version 37.
     * Must be the synchronizer's protocol version or a lower one whose topology transactions the synchronizer admits:
     * from protocol version 37 on, a synchronizer admits those of protocol version 36.
     * Defaults to the synchronizer's protocol version.
     *
     * Optional
     */
    protocolVersion?: number;
};

