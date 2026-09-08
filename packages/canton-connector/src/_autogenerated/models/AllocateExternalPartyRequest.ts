/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Signature } from './Signature';
import type { SignedTransaction } from './SignedTransaction';
/**
 * Required authorization:
 * ``HasRight(ParticipantAdmin) OR IsAuthenticatedIdentityProviderAdmin(identity_provider_id) OR IsAuthenticatedUser(user_id)``
 */
export type AllocateExternalPartyRequest = {
    /**
     * TODO(#27670) support synchronizer aliases
     * Synchronizer ID on which to onboard the party
     *
     * Required
     */
    synchronizer: string;
    /**
     * TopologyTransactions to onboard the external party
     * Can contain:
     * - A namespace for the party.
     * This can be either a single NamespaceDelegation,
     * or DecentralizedNamespaceDefinition along with its authorized namespace owners in the form of NamespaceDelegations.
     * May be provided, if so it must be fully authorized by the signatures in this request combined with the existing topology state.
     * - A PartyToParticipant to register the hosting relationship of the party, and the party's signing keys and threshold.
     * Must be provided.
     *
     * Required: must be non-empty
     */
    onboardingTransactions: Array<SignedTransaction>;
    /**
     * Optional signatures of the combined hash of all onboarding_transactions
     * This may be used instead of providing signatures on each individual transaction
     *
     * Optional: can be empty
     */
    multiHashSignatures?: Array<Signature>;
    /**
     * The id of the ``Identity Provider``
     * If not set, assume the party is managed by the default identity provider.
     *
     * Optional
     */
    identityProviderId?: string;
    /**
     * When true, this RPC will attempt to wait for the party to be allocated on the synchronizer before returning.
     * When false, the allocation will happen asynchronously.
     * This is a best effort only as this synchronization is only possible for non decentralized parties (single hosting node).
     * For decentralized parties, this flag is ignored.
     * Defaults to true.
     *
     * Optional
     */
    waitForAllocation?: boolean;
    /**
     * The user who will get the act_as rights to the newly allocated party.
     * If set to an empty string (the default), no user will get rights to the party.
     *
     * Optional
     */
    userId?: string;
};

