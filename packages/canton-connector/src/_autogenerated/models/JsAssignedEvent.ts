/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatedEvent } from './CreatedEvent';
/**
 * Records that a contract has been assigned, and it can be used on the target synchronizer.
 */
export type JsAssignedEvent = {
    /**
     * The ID of the source synchronizer.
     * Must be a valid synchronizer id.
     * Required
     */
    source: string;
    /**
     * The ID of the target synchronizer.
     * Must be a valid synchronizer id.
     * Required
     */
    target: string;
    /**
     * The ID from the unassigned event.
     * For correlation capabilities.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    reassignmentId: string;
    /**
     * Party on whose behalf the assign command was executed.
     * Empty if the assignment happened offline via the repair service.
     * Must be a valid PartyIdString (as described in ``value.proto``).
     * Optional
     */
    submitter: string;
    /**
     * Each corresponding assigned and unassigned event has the same reassignment_counter. This strictly increases
     * with each unassign command for the same contract. Creation of the contract corresponds to reassignment_counter
     * equals zero.
     * Required
     */
    reassignmentCounter: number;
    /**
     * Required
     * The offset of this event refers to the offset of the assignment,
     * while the node_id is the index of within the batch.
     */
    createdEvent: CreatedEvent;
};

