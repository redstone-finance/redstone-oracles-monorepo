/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Records that a choice has been exercised on a target contract.
 */
export type ExercisedEvent = {
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
     * The ID of the target contract.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    contractId: string;
    /**
     * Identifies the template that defines the executed choice.
     * This template's package-id may differ from the target contract's package-id
     * if the target contract has been upgraded or downgraded.
     *
     * The identifier uses the package-id reference format.
     *
     * Required
     */
    templateId: string;
    /**
     * The interface where the choice is defined, if inherited.
     * If defined, the identifier uses the package-id reference format.
     *
     * Optional
     */
    interfaceId?: string;
    /**
     * The choice that was exercised on the target contract.
     * Must be a valid NameString (as described in ``value.proto``).
     * Required
     */
    choice: string;
    /**
     * The argument of the exercised choice.
     * Required
     */
    choiceArgument: any;
    /**
     * The parties that exercised the choice.
     * Each element must be a valid PartyIdString (as described in ``value.proto``).
     * Required
     */
    actingParties?: Array<string>;
    /**
     * If true, the target contract may no longer be exercised.
     * Required
     */
    consuming: boolean;
    /**
     * The parties that are notified of this event. The witnesses of an exercise
     * node will depend on whether the exercise was consuming or not.
     * If consuming, the witnesses are the union of the stakeholders,
     * the actors and all informees of all the ancestors of this event this
     * participant knows about.
     * If not consuming, the witnesses are the union of the signatories,
     * the actors and all informees of all the ancestors of this event this
     * participant knows about.
     * In both cases the witnesses are limited to the querying parties, or not
     * limited in case anyParty filters are used.
     * Note that the actors might not necessarily be observers
     * and thus stakeholders. This is the case when the controllers of a
     * choice are specified using "flexible controllers", using the
     * ``choice ... controller`` syntax, and said controllers are not
     * explicitly marked as observers.
     * Each element must be a valid PartyIdString (as described in ``value.proto``).
     * Required
     */
    witnessParties?: Array<string>;
    /**
     * Specifies the upper boundary of the node ids of the events in the same transaction that appeared as a result of
     * this ``ExercisedEvent``. This allows unambiguous identification of all the members of the subtree rooted at this
     * node. A full subtree can be constructed when all descendant nodes are present in the stream. If nodes are heavily
     * filtered, it is only possible to determine if a node is in a consequent subtree or not.
     * Required
     */
    lastDescendantNodeId: number;
    /**
     * The result of exercising the choice.
     * Required
     */
    exerciseResult: any;
    /**
     * The package name of the contract.
     * Required
     */
    packageName: string;
    /**
     * If the event is consuming, the interfaces implemented by the target template that have been
     * matched from the interface filter query.
     * Populated only in case interface filters with include_interface_view set.
     *
     * The identifier uses the package-id reference format.
     *
     * Optional
     */
    implementedInterfaces?: Array<string>;
    /**
     * Whether this event would be part of respective ACS_DELTA shaped stream,
     * and should therefore considered when tracking contract activeness on the client-side.
     * Required
     */
    acsDelta: boolean;
};

