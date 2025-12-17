/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatedEvent } from './CreatedEvent';
export type JsCreated = {
    /**
     * Required
     * The event as it appeared in the context of its original update (i.e. daml transaction or
     * reassignment) on this participant node. You can use its offset and node_id to find the
     * corresponding update and the node within it.
     */
    createdEvent: CreatedEvent;
    /**
     * The synchronizer which sequenced the creation of the contract
     * Required
     */
    synchronizerId: string;
};

