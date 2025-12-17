/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Exercise a choice on an existing contract specified by its key.
 */
export type ExerciseByKeyCommand = {
    /**
     * The template of contract the client wants to exercise.
     * Both package-name and package-id reference identifier formats for the template-id are supported.
     * Note: The package-id reference identifier format is deprecated. We plan to end support for this format in version 3.4.
     *
     * Required
     */
    templateId: string;
    /**
     * The key of the contract the client wants to exercise upon.
     * Required
     */
    contractKey: any;
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

