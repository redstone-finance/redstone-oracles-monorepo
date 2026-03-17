/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatedEvent } from './CreatedEvent';
export type GetContractResponse = {
    /**
     * The representative_package_id will be always set to the contract package ID, therefore this endpoint should
     * not be used to lookup contract which entered the participant via party replication or repair service.
     * The witnesses field will contain only the querying_parties which are also stakeholders of the contract as well.
     * The following fields of the created event cannot be populated, so those should not be used / parsed:
     *
     * - offset
     * - node_id
     * - created_event_blob
     * - interface_views
     * - acs_delta
     *
     * Required
     */
    createdEvent?: CreatedEvent;
};

