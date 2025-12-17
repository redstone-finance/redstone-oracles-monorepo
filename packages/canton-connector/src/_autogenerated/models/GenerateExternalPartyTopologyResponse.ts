/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response message with topology transactions and the multi-hash to be signed.
 */
export type GenerateExternalPartyTopologyResponse = {
    /**
     * the generated party id
     */
    partyId: string;
    /**
     * the fingerprint of the supplied public key
     */
    publicKeyFingerprint: string;
    /**
     * The serialized topology transactions which need to be signed and submitted as part of the allocate party process
     * Note that the serialization includes the versioning information. Therefore, the transaction here is serialized
     * as an `UntypedVersionedMessage` which in turn contains the serialized `TopologyTransaction` in the version
     * supported by the synchronizer.
     */
    topologyTransactions?: Array<string>;
    /**
     * the multi-hash which may be signed instead of each individual transaction
     */
    multiHash: string;
};

