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
     * If unset, no transactions are emitted in the stream.
     *
     * Optional
     */
    includeTransactions?: TransactionFormat;
    /**
     * Include (un)assignments in the stream.
     * The events in the result take the shape TRANSACTION_SHAPE_ACS_DELTA.
     * If unset, no (un)assignments are emitted in the stream.
     *
     * Optional
     */
    includeReassignments?: EventFormat;
    /**
     * Include topology events in streams.
     * If unset no topology events are emitted in the stream.
     *
     * Optional
     */
    includeTopologyEvents?: TopologyFormat;
};

