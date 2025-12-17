/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Signature } from './Signature';
/**
 * Signatures provided by a single party
 */
export type SinglePartySignatures = {
    /**
     * Submitting party
     * Required
     */
    party: string;
    /**
     * Signatures
     * Required
     */
    signatures?: Array<Signature>;
};

