/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JsActiveContract } from './JsActiveContract';
import type { JsEmpty } from './JsEmpty';
import type { JsIncompleteAssigned } from './JsIncompleteAssigned';
import type { JsIncompleteUnassigned } from './JsIncompleteUnassigned';
/**
 * For a contract there could be multiple contract_entry-s in the entire snapshot. These together define
 * the state of one contract in the snapshot.
 * A contract_entry is included in the result, if and only if there is at least one stakeholder party of the contract
 * that is hosted on the synchronizer at the time of the event and the party satisfies the
 * ``TransactionFilter`` in the query.
 */
export type JsContractEntry = ({
    JsActiveContract: JsActiveContract;
} | {
    JsEmpty: JsEmpty;
} | {
    JsIncompleteAssigned: JsIncompleteAssigned;
} | {
    JsIncompleteUnassigned: JsIncompleteUnassigned;
});

