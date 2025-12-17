/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Records that a contract has been unassigned, and it becomes unusable on the source synchronizer
 */
export type UnassignedEvent = {
    /**
     * The ID of the unassignment. This needs to be used as an input for a assign ReassignmentCommand.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    reassignmentId: string;
    /**
     * The ID of the reassigned contract.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    contractId: string;
    /**
     * The template of the reassigned contract.
     * The identifier uses the package-id reference format.
     *
     * Required
     */
    templateId?: string;
    /**
     * The ID of the source synchronizer
     * Must be a valid synchronizer id
     * Required
     */
    source: string;
    /**
     * The ID of the target synchronizer
     * Must be a valid synchronizer id
     * Required
     */
    target: string;
    /**
     * Party on whose behalf the unassign command was executed.
     * Empty if the unassignment happened offline via the repair service.
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
     * Assignment exclusivity
     * Before this time (measured on the target synchronizer), only the submitter of the unassignment can initiate the assignment
     * Defined for reassigning participants.
     * Optional
     */
    assignmentExclusivity?: string;
    /**
     * The parties that are notified of this event.
     * Required
     */
    witnessParties?: Array<string>;
    /**
     * The package name of the contract.
     * Required
     */
    packageName: string;
    /**
     * The offset of origin.
     * Offsets are managed by the participant nodes.
     * Reassignments can thus NOT be assumed to have the same offsets on different participant nodes.
     * Required, it is a valid absolute offset (positive integer)
     */
    offset: number;
    /**
     * The position of this event in the originating reassignment.
     * Node IDs are not necessarily equal across participants,
     * as these may see different projections/parts of reassignments.
     * Required, must be valid node ID (non-negative integer)
     */
    nodeId: number;
};

