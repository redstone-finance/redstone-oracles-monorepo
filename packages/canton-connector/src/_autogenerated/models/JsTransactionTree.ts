/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Map_Int_TreeEvent } from './Map_Int_TreeEvent';
import type { TraceContext } from './TraceContext';
/**
 * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
 * Complete view of an on-ledger transaction.
 */
export type JsTransactionTree = {
    /**
     * Assigned by the server. Useful for correlating logs.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    updateId: string;
    /**
     * The ID of the command which resulted in this transaction. Missing for everyone except the submitting party.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Optional
     */
    commandId: string;
    /**
     * The workflow ID used in command submission. Only set if the ``workflow_id`` for the command was set.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Optional
     */
    workflowId: string;
    /**
     * Ledger effective time.
     * Required
     */
    effectiveAt?: string;
    /**
     * The absolute offset. The details of this field are described in ``community/ledger-api/README.md``.
     * Required, it is a valid absolute offset (positive integer).
     */
    offset: number;
    /**
     * Changes to the ledger that were caused by this transaction. Nodes of the transaction tree.
     * Each key must be a valid node ID (non-negative integer).
     * Required
     */
    eventsById: Map_Int_TreeEvent;
    /**
     * A valid synchronizer id.
     * Identifies the synchronizer that synchronized the transaction.
     * Required
     */
    synchronizerId: string;
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
     * The time at which the transaction was recorded. The record time refers to the synchronizer
     * which synchronized the transaction.
     * Required
     */
    recordTime: string;
};

