/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * This filter matches contracts of a specific template.
 */
export type TemplateFilter1 = {
    /**
     * A template for which the payload should be included in the response.
     * The ``template_id`` needs to be valid: corresponding template should be defined in
     * one of the available packages at the time of the query.
     * Both package-name and package-id reference formats for the identifier are supported.
     * Note: The package-id reference identifier format is deprecated. We plan to end support for this format in version 3.4.
     *
     * Required
     */
    templateId?: string;
    /**
     * Whether to include a ``created_event_blob`` in the returned ``CreatedEvent``.
     * Use this to access the contract event payload in your API client
     * for submitting it as a disclosed contract with future commands.
     * Optional
     */
    includeCreatedEventBlob: boolean;
};

