/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventFormat } from './EventFormat';
/**
 * A format that specifies what events to include in Daml transactions
 * and what data to compute and include for them.
 */
export type TransactionFormat = {
    /**
     * Required
     */
    eventFormat?: EventFormat;
    /**
     * What transaction shape to use for interpreting the filters of the event format.
     * Required
     */
    transactionShape: TransactionFormat.transactionShape;
};
export namespace TransactionFormat {
    /**
     * What transaction shape to use for interpreting the filters of the event format.
     * Required
     */
    export enum transactionShape {
        TRANSACTION_SHAPE_UNSPECIFIED = 'TRANSACTION_SHAPE_UNSPECIFIED',
        TRANSACTION_SHAPE_ACS_DELTA = 'TRANSACTION_SHAPE_ACS_DELTA',
        TRANSACTION_SHAPE_LEDGER_EFFECTS = 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
    }
}

