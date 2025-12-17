/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OffsetCheckpoint2 } from './OffsetCheckpoint2';
import type { Reassignment } from './Reassignment';
import type { TopologyTransaction } from './TopologyTransaction';
import type { Transaction } from './Transaction';
export type Update = ({
    OffsetCheckpoint: OffsetCheckpoint2;
} | {
    Reassignment: Reassignment;
} | {
    TopologyTransaction: TopologyTransaction;
} | {
    Transaction: Transaction;
});

