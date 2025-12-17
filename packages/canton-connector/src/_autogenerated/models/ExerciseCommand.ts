/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Exercise a choice on an existing contract.
 */
export type ExerciseCommand = {
    /**
     * The template or interface of the contract the client wants to exercise.
     * Both package-name and package-id reference identifier formats for the template-id are supported.
     * Note: The package-id reference identifier format is deprecated. We plan to end support for this format in version 3.4.
     * To exercise a choice on an interface, specify the interface identifier in the template_id field.
     *
     * Required
     */
    templateId: string;
    /**
     * The ID of the contract the client wants to exercise upon.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    contractId: string;
    /**
     * The name of the choice the client wants to exercise.
     * Must be a valid NameString (as described in ``value.proto``)
     * Required
     */
    choice: string;
    /**
     * The argument for this choice.
     * Required
     */
    choiceArgument: any;
};

