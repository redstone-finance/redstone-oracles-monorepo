/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsCommands } from './JsCommands';
import type { TransactionFormat } from './TransactionFormat';
/**
 * These commands are executed as a single atomic transaction.
 */
export type JsSubmitAndWaitForTransactionRequest = {
    /**
     * The commands to be submitted.
     * Required
     */
    commands: JsCommands;
    /**
     * If no ``transaction_format`` is provided, a default will be used where ``transaction_shape`` is set to
     * TRANSACTION_SHAPE_ACS_DELTA, ``event_format`` is defined with ``filters_by_party`` containing wildcard-template
     * filter for all original ``act_as`` and ``read_as`` parties and the ``verbose`` flag is set.
     * Optional
     */
    transactionFormat?: TransactionFormat;
};

