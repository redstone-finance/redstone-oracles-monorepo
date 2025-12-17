/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeduplicationDuration1 } from './DeduplicationDuration1';
import type { DeduplicationOffset1 } from './DeduplicationOffset1';
import type { Empty3 } from './Empty3';
/**
 * The actual deduplication window used for the submission, which is derived from
 * ``Commands.deduplication_period``. The ledger may convert the deduplication period into other
 * descriptions and extend the period in implementation-specified ways.
 *
 * Used to audit the deduplication guarantee described in ``commands.proto``.
 *
 * Optional; the deduplication guarantee applies even if the completion omits this field.
 */
export type DeduplicationPeriod1 = ({
    DeduplicationDuration: DeduplicationDuration1;
} | {
    DeduplicationOffset: DeduplicationOffset1;
} | {
    Empty: Empty3;
});

