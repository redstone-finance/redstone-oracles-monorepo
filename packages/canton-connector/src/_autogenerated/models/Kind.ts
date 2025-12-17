/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CanActAs } from './CanActAs';
import type { CanExecuteAs } from './CanExecuteAs';
import type { CanExecuteAsAnyParty } from './CanExecuteAsAnyParty';
import type { CanReadAs } from './CanReadAs';
import type { CanReadAsAnyParty } from './CanReadAsAnyParty';
import type { Empty8 } from './Empty8';
import type { IdentityProviderAdmin } from './IdentityProviderAdmin';
import type { ParticipantAdmin } from './ParticipantAdmin';
/**
 * Required
 */
export type Kind = ({
    CanActAs: CanActAs;
} | {
    CanExecuteAs: CanExecuteAs;
} | {
    CanExecuteAsAnyParty: CanExecuteAsAnyParty;
} | {
    CanReadAs: CanReadAs;
} | {
    CanReadAsAnyParty: CanReadAsAnyParty;
} | {
    Empty: Empty8;
} | {
    IdentityProviderAdmin: IdentityProviderAdmin;
} | {
    ParticipantAdmin: ParticipantAdmin;
});

