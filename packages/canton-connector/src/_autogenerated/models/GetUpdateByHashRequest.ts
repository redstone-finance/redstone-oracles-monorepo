/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UpdateFormat } from './UpdateFormat';
export type GetUpdateByHashRequest = {
    /**
     * The transaction hash to look up.
     *
     * Required: must be non-empty
     */
    transactionHash: string;
    /**
     * The format for the update.
     *
     * Required
     */
    updateFormat: UpdateFormat;
};

