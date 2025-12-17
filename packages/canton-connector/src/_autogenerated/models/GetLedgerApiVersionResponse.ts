/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeaturesDescriptor } from './FeaturesDescriptor';
export type GetLedgerApiVersionResponse = {
    /**
     * The version of the ledger API.
     */
    version: string;
    /**
     * The features supported by this Ledger API endpoint.
     *
     * Daml applications CAN use the feature descriptor on top of
     * version constraints on the Ledger API version to determine
     * whether a given Ledger API endpoint supports the features
     * required to run the application.
     *
     * See the feature descriptions themselves for the relation between
     * Ledger API versions and feature presence.
     */
    features?: FeaturesDescriptor;
};

