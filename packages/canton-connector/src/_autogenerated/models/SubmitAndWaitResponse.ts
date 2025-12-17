/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SubmitAndWaitResponse = {
    /**
     * The id of the transaction that resulted from the submitted command.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    updateId: string;
    /**
     * The details of the offset field are described in ``community/ledger-api/README.md``.
     * Required
     */
    completionOffset: number;
};

