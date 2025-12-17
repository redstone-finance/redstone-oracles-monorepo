/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsTransaction } from './JsTransaction';
export type JsSubmitAndWaitForTransactionResponse = {
    /**
     * The transaction that resulted from the submitted command.
     * The transaction might contain no events (request conditions result in filtering out all of them).
     * Required
     */
    transaction: JsTransaction;
};

