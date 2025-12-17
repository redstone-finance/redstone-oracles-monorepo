/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsArchived } from './JsArchived';
import type { JsCreated } from './JsCreated';
export type JsGetEventsByContractIdResponse = {
    /**
     * The create event for the contract with the ``contract_id`` given in the request
     * provided it exists and has not yet been pruned.
     * Optional
     */
    created?: JsCreated;
    /**
     * The archive event for the contract with the ``contract_id`` given in the request
     * provided such an archive event exists and it has not yet been pruned.
     * Optional
     */
    archived?: JsArchived;
};

