/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UpdateFormat } from './UpdateFormat';
export type GetUpdateByOffsetRequest = {
    /**
     * The offset of the update being looked up.
     * Must be a valid absolute offset (positive integer).
     * Required
     */
    offset: number;
    /**
     * The format for the update.
     * Required
     */
    updateFormat?: UpdateFormat;
};

