/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TopologyEvent } from './TopologyEvent';
import type { TraceContext } from './TraceContext';
export type JsTopologyTransaction = {
    /**
     * Assigned by the server. Useful for correlating logs.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    updateId: string;
    /**
     * The absolute offset. The details of this field are described in ``community/ledger-api/README.md``.
     * Required, it is a valid absolute offset (positive integer).
     */
    offset: number;
    /**
     * A valid synchronizer id.
     * Identifies the synchronizer that synchronized the topology transaction.
     * Required
     */
    synchronizerId: string;
    /**
     * The time at which the changes in the topology transaction become effective. There is a small delay between a
     * topology transaction being sequenced and the changes it contains becoming effective. Topology transactions appear
     * in order relative to a synchronizer based on their effective time rather than their sequencing time.
     * Required
     */
    recordTime?: string;
    /**
     * A non-empty list of topology events.
     * Required
     */
    events?: Array<TopologyEvent>;
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
};

