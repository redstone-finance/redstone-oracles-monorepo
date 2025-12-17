/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsReassignment } from './JsReassignment';
export type JsSubmitAndWaitForReassignmentResponse = {
    /**
     * The reassignment that resulted from the submitted reassignment command.
     * The reassignment might contain no events (request conditions result in filtering out all of them).
     * Required
     */
    reassignment: JsReassignment;
};

