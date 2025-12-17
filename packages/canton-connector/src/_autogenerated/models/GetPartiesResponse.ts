/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PartyDetails } from './PartyDetails';
export type GetPartiesResponse = {
    /**
     * The details of the requested Daml parties by the participant, if known.
     * The party details may not be in the same order as requested.
     * Required
     */
    partyDetails?: Array<PartyDetails>;
};

