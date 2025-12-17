/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PartyDetails } from './PartyDetails';
export type ListKnownPartiesResponse = {
    /**
     * The details of all Daml parties known by the participant.
     * Required
     */
    partyDetails?: Array<PartyDetails>;
    /**
     * Pagination token to retrieve the next page.
     * Empty, if there are no further results.
     */
    nextPageToken: string;
};

