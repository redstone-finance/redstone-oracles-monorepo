/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PartyDetails } from './PartyDetails';
export type ListKnownPartiesResponse = {
    /**
     * The details of all Daml parties known by the participant.
     *
     * Required: must be non-empty
     */
    partyDetails: Array<PartyDetails>;
    /**
     * Pagination token to retrieve the next page.
     * Empty, if there are no further results.
     *
     * Optional
     */
    nextPageToken?: string;
};

