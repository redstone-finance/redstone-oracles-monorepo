/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArchivedEvent } from './ArchivedEvent';
export type JsArchived = {
    /**
     * Required
     */
    archivedEvent: ArchivedEvent;
    /**
     * Required
     * The synchronizer which sequenced the archival of the contract
     */
    synchronizerId: string;
};

