/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a new contract instance based on a template.
 */
export type CreateCommand = {
    /**
     * The template of contract the client wants to create.
     * Both package-name and package-id reference identifier formats for the template-id are supported.
     * Note: The package-id reference identifier format is deprecated. We plan to end support for this format in version 3.4.
     *
     * Required
     */
    templateId: string;
    /**
     * The arguments required for creating a contract from this template.
     * Required
     */
    createArguments: any;
};

