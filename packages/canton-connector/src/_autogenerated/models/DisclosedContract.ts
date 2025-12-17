/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * An additional contract that is used to resolve
 * contract & contract key lookups.
 */
export type DisclosedContract = {
    /**
     * The template id of the contract.
     * The identifier uses the package-id reference format.
     *
     * If provided, used to validate the template id of the contract serialized in the created_event_blob.
     * Optional
     */
    templateId?: string;
    /**
     * The contract id
     *
     * If provided, used to validate the contract id of the contract serialized in the created_event_blob.
     * Optional
     */
    contractId: string;
    /**
     * Opaque byte string containing the complete payload required by the Daml engine
     * to reconstruct a contract not known to the receiving participant.
     * Required
     */
    createdEventBlob: string;
    /**
     * The ID of the synchronizer where the contract is currently assigned
     * Optional
     */
    synchronizerId: string;
};

