/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsStatus } from './JsStatus';
/**
 * View of a create event matched by an interface filter.
 */
export type JsInterfaceView = {
    /**
     * The interface implemented by the matched event.
     * The identifier uses the package-id reference format.
     *
     * Required
     */
    interfaceId: string;
    /**
     * Whether the view was successfully computed, and if not,
     * the reason for the error. The error is reported using the same rules
     * for error codes and messages as the errors returned for API requests.
     * Required
     */
    viewStatus: JsStatus;
    /**
     * The value of the interface's view method on this event.
     * Set if it was requested in the ``InterfaceFilter`` and it could be
     * successfully computed.
     * Optional
     */
    viewValue?: any;
};

