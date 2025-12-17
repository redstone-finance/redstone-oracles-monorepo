/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SinglePartySignatures } from './SinglePartySignatures';
/**
 * Additional signatures provided by the submitting parties
 */
export type PartySignatures = {
    /**
     * Additional signatures provided by all individual parties
     * Required
     */
    signatures?: Array<SinglePartySignatures>;
};

