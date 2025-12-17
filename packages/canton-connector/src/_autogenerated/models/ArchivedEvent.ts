/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Records that a contract has been archived, and choices may no longer be exercised on it.
 */
export type ArchivedEvent = {
    /**
     * The offset of origin.
     * Offsets are managed by the participant nodes.
     * Transactions can thus NOT be assumed to have the same offsets on different participant nodes.
     * Required, it is a valid absolute offset (positive integer)
     */
    offset: number;
    /**
     * The position of this event in the originating transaction or reassignment.
     * Node IDs are not necessarily equal across participants,
     * as these may see different projections/parts of transactions.
     * Required, must be valid node ID (non-negative integer)
     */
    nodeId: number;
    /**
     * The ID of the archived contract.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    contractId: string;
    /**
     * Identifies the template that defines the choice that archived the contract.
     * This template's package-id may differ from the target contract's package-id
     * if the target contract has been upgraded or downgraded.
     *
     * The identifier uses the package-id reference format.
     *
     * Required
     */
    templateId: string;
    /**
     * The parties that are notified of this event. For an ``ArchivedEvent``,
     * these are the intersection of the stakeholders of the contract in
     * question and the parties specified in the ``TransactionFilter``. The
     * stakeholders are the union of the signatories and the observers of
     * the contract.
     * Each one of its elements must be a valid PartyIdString (as described
     * in ``value.proto``).
     * Required
     */
    witnessParties?: Array<string>;
    /**
     * The package name of the contract.
     * Required
     */
    packageName: string;
    /**
     * The interfaces implemented by the target template that have been
     * matched from the interface filter query.
     * Populated only in case interface filters with include_interface_view set.
     *
     * If defined, the identifier uses the package-id reference format.
     *
     * Optional
     */
    implementedInterfaces?: Array<string>;
};

