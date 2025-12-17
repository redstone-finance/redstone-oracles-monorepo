/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Event } from './Event';
import type { TraceContext } from './TraceContext';
/**
 * Filtered view of an on-ledger transaction's create and archive events.
 */
export type JsTransaction = {
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
     * The workflow ID used in command submission.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Optional
     */
    workflowId: string;
    /**
     * Ledger effective time.
     * Required
     */
    effectiveAt: string;
    /**
     * The collection of events.
     * Contains:
     *
     * - ``CreatedEvent`` or ``ArchivedEvent`` in case of ACS_DELTA transaction shape
     * - ``CreatedEvent`` or ``ExercisedEvent`` in case of LEDGER_EFFECTS transaction shape
     *
     * Required
     */
    events?: Array<Event>;
    /**
     * The absolute offset. The details of this field are described in ``community/ledger-api/README.md``.
     * Required, it is a valid absolute offset (positive integer).
     */
    offset: number;
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
    /**
     * For transaction externally signed, contains the external transaction hash
     * signed by the external party. Can be used to correlate an external submission with a committed transaction.
     * Optional
     */
    externalTransactionHash?: string;
};

