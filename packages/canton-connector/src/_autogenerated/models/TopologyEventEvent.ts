/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Empty7 } from './Empty7';
import type { ParticipantAuthorizationAdded } from './ParticipantAuthorizationAdded';
import type { ParticipantAuthorizationChanged } from './ParticipantAuthorizationChanged';
import type { ParticipantAuthorizationRevoked } from './ParticipantAuthorizationRevoked';
export type TopologyEventEvent = ({
    Empty: Empty7;
} | {
    ParticipantAuthorizationAdded: ParticipantAuthorizationAdded;
} | {
    ParticipantAuthorizationChanged: ParticipantAuthorizationChanged;
} | {
    ParticipantAuthorizationRevoked: ParticipantAuthorizationRevoked;
});

