/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Signature } from './Signature';
export type SignedTransaction = {
    /**
     * The serialized TopologyTransaction
     *
     * Required: must be non-empty
     */
    transaction: string;
    /**
     * Additional signatures for this transaction specifically
     * Use for transactions that require additional signatures beyond the namespace key signatures
     * e.g: PartyToParticipant must be signed by all registered keys
     *
     * Optional: can be empty
     */
    signatures?: Array<Signature>;
};

