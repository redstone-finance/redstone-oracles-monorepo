/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Completion1 } from './Completion1';
export type GetCompletionByHashResponse = {
    /**
     * The accepted completion for the given transaction hash (at most one can exist).
     * Only completions beyond the current pruning offset are visible.
     *
     * Optional
     */
    acceptedCompletion?: Completion1;
    /**
     * Recent rejected completions for the given transaction hash, in descending offset order.
     * The server may truncate this list if there are too many entries.
     * Use ``submission_id`` to correlate with a specific command submission.
     * Only completions beyond the current pruning offset are visible.
     *
     * Optional: can be empty
     */
    lastRejectedCompletions?: Array<Completion1>;
};

