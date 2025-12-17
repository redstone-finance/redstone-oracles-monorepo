/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatedEvent } from './CreatedEvent';
import type { UnassignedEvent } from './UnassignedEvent';
export type JsIncompleteUnassigned = {
    /**
     * Required
     * The event as it appeared in the context of its last activation update (i.e. daml transaction or
     * reassignment). In particular, the last activation offset, node_id pair is preserved.
     * The last activation update is the most recent update created or assigned this contract on synchronizer_id synchronizer before
     * the unassigned_event.
     * The offset of the CreatedEvent might point to an already pruned update, therefore it cannot necessarily be used
     * for lookups.
     */
    createdEvent: CreatedEvent;
    /**
     * Required
     */
    unassignedEvent: UnassignedEvent;
};

