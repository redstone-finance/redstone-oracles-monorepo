/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsReassignmentEvent } from './JsReassignmentEvent';
import type { TraceContext } from './TraceContext';
/**
 * Complete view of an on-ledger reassignment.
 */
export type JsReassignment = {
    /**
     * Assigned by the server. Useful for correlating logs.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    updateId: string;
    /**
     * The ID of the command which resulted in this reassignment. Missing for everyone except the submitting party on the submitting participant.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Optional
     */
    commandId: string;
    /**
     * The workflow ID used in reassignment command submission. Only set if the ``workflow_id`` for the command was set.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Optional
     */
    workflowId: string;
    /**
     * The participant's offset. The details of this field are described in ``community/ledger-api/README.md``.
     * Required, must be a valid absolute offset (positive integer).
     */
    offset: number;
    /**
     * The collection of reassignment events. Required.
     */
    events?: Array<JsReassignmentEvent>;
    /**
     * Optional; ledger API trace context
     *
     * The trace context transported in this message corresponds to the trace context supplied
     * by the client application in a HTTP2 header of the original command submission.
     * We typically use a header to transfer this type of information. Here we use message
     * body, because it is used in gRPC streams which do not support per message headers.
     * This field will be populated with the trace context contained in the original submission.
     * If that was not provided, a unique ledger-api-server generated trace context will be used
     * instead.
     */
    traceContext?: TraceContext;
    /**
     * The time at which the reassignment was recorded. The record time refers to the source/target
     * synchronizer for an unassign/assign event respectively.
     * Required
     */
    recordTime: string;
    /**
     * A valid synchronizer id.
     * Identifies the synchronizer that synchronized this Reassignment.
     * Required
     */
    synchronizerId: string;
};

