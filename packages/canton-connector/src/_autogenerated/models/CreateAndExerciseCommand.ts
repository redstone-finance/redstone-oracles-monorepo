/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a contract and exercise a choice on it in the same transaction.
 */
export type CreateAndExerciseCommand = {
    /**
     * The template of the contract the client wants to create.
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
    /**
     * The name of the choice the client wants to exercise.
     * Must be a valid NameString (as described in ``value.proto``).
     * Required
     */
    choice: string;
    /**
     * The argument for this choice.
     * Required
     */
    choiceArgument: any;
};

