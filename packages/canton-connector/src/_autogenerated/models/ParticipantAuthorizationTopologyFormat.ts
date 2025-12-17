/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A format specifying which participant authorization topology transactions to include and how to render them.
 */
export type ParticipantAuthorizationTopologyFormat = {
    /**
     * List of parties for which the topology transactions should be sent.
     * Empty means: for all parties.
     */
    parties?: Array<string>;
};

