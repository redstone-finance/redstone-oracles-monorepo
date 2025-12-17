/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssignCommand } from './AssignCommand';
import type { Empty2 } from './Empty2';
import type { UnassignCommand } from './UnassignCommand';
/**
 * A command can either create a new contract or exercise a choice on an existing contract.
 */
export type Command1 = ({
    AssignCommand: AssignCommand;
} | {
    Empty: Empty2;
} | {
    UnassignCommand: UnassignCommand;
});

