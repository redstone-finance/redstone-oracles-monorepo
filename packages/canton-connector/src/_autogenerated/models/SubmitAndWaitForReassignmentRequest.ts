/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventFormat } from './EventFormat';
import type { ReassignmentCommands } from './ReassignmentCommands';
/**
 * This reassignment is executed as a single atomic update.
 */
export type SubmitAndWaitForReassignmentRequest = {
    /**
     * The reassignment commands to be submitted.
     * Required
     */
    reassignmentCommands?: ReassignmentCommands;
    /**
     * Optional
     * If no event_format provided, the result will contain no events.
     * The events in the result, will take shape TRANSACTION_SHAPE_ACS_DELTA.
     */
    eventFormat?: EventFormat;
};

