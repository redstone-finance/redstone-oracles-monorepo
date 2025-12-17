/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeduplicationDuration } from './DeduplicationDuration';
import type { DeduplicationOffset } from './DeduplicationOffset';
import type { Empty } from './Empty';
/**
 * Specifies the deduplication period for the change ID.
 * If omitted, the participant will assume the configured maximum deduplication time.
 */
export type DeduplicationPeriod = ({
    DeduplicationDuration: DeduplicationDuration;
} | {
    DeduplicationOffset: DeduplicationOffset;
} | {
    Empty: Empty;
});

