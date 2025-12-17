/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatedEvent } from './CreatedEvent';
export type JsActiveContract = {
    /**
     * Required
     * The event as it appeared in the context of its last update (i.e. daml transaction or
     * reassignment). In particular, the last offset, node_id pair is preserved.
     * The last update is the most recent update created or assigned this contract on synchronizer_id synchronizer.
     * The offset of the CreatedEvent might point to an already pruned update, therefore it cannot necessarily be used
     * for lookups.
     */
    createdEvent: CreatedEvent;
    /**
     * A valid synchronizer id
     * Required
     */
    synchronizerId: string;
    /**
     * Each corresponding assigned and unassigned event has the same reassignment_counter. This strictly increases
     * with each unassign command for the same contract. Creation of the contract corresponds to reassignment_counter
     * equals zero.
     * This field will be the reassignment_counter of the latest observable activation event on this synchronizer, which is
     * before the active_at_offset.
     * Required
     */
    reassignmentCounter: number;
};

