/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UpdateFormat } from './UpdateFormat';
export type GetUpdateByIdRequest = {
    /**
     * The ID of a particular update.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    updateId: string;
    /**
     * The format for the update.
     * Required
     */
    updateFormat?: UpdateFormat;
};

