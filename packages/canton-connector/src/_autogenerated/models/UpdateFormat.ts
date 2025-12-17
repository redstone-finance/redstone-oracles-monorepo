/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventFormat } from './EventFormat';
import type { TopologyFormat } from './TopologyFormat';
import type { TransactionFormat } from './TransactionFormat';
/**
 * A format specifying what updates to include and how to render them.
 */
export type UpdateFormat = {
    /**
     * Include Daml transactions in streams.
     * Optional, if unset, no transactions are emitted in the stream.
     */
    includeTransactions?: TransactionFormat;
    /**
     * Include (un)assignments in the stream.
     * The events in the result take the shape TRANSACTION_SHAPE_ACS_DELTA.
     * Optional, if unset, no (un)assignments are emitted in the stream.
     */
    includeReassignments?: EventFormat;
    /**
     * Include topology events in streams.
     * Optional, if unset no topology events are emitted in the stream.
     */
    includeTopologyEvents?: TopologyFormat;
};

