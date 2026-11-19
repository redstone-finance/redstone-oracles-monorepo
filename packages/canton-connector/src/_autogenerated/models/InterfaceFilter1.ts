/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * This filter matches contracts that implement a specific interface.
 */
export type InterfaceFilter1 = {
    /**
     * The interface that a matching contract must implement.
     * The ``interface_id`` needs to be valid: corresponding interface should be defined in
     * one of the available packages at the time of the query.
     * Only package-name reference format for the identifier is supported.
     * Note: The package-id reference identifier format was removed in version 3.5.
     *
     * Required
     */
    interfaceId: string;
    /**
     * Whether to include the interface view on the contract in the returned ``CreatedEvent``.
     * Use this to access contract data in a uniform manner in your API client.
     *
     * Optional
     */
    includeInterfaceView?: boolean;
    /**
     * Whether to include a ``created_event_blob`` in the returned ``CreatedEvent``.
     * Use this to access the contract create event payload in your API client
     * for submitting it as a disclosed contract with future commands.
     *
     * Optional
     */
    includeCreatedEventBlob?: boolean;
};

