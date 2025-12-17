/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ParticipantAuthorizationTopologyFormat } from './ParticipantAuthorizationTopologyFormat';
/**
 * A format specifying which topology transactions to include and how to render them.
 */
export type TopologyFormat = {
    /**
     * Include participant authorization topology events in streams.
     * Optional, if unset no participant authorization topology events are emitted in the stream.
     */
    includeParticipantAuthorizationEvents?: ParticipantAuthorizationTopologyFormat;
};

