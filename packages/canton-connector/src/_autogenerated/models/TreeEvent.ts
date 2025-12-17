/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatedTreeEvent } from './CreatedTreeEvent';
import type { ExercisedTreeEvent } from './ExercisedTreeEvent';
/**
 * Provided for backwards compatibility, it will be removed in the Canton version 3.5.0.
 * Each tree event message type below contains a ``witness_parties`` field which
 * indicates the subset of the requested parties that can see the event
 * in question.
 *
 * Note that transaction trees might contain events with
 * _no_ witness parties, which were included simply because they were
 * children of events which have witnesses.
 */
export type TreeEvent = ({
    CreatedTreeEvent: CreatedTreeEvent;
} | {
    ExercisedTreeEvent: ExercisedTreeEvent;
});

