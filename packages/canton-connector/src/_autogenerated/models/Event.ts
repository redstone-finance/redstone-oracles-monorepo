/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArchivedEvent } from './ArchivedEvent';
import type { CreatedEvent } from './CreatedEvent';
import type { ExercisedEvent } from './ExercisedEvent';
/**
 * Events in transactions can have two primary shapes:
 *
 * - ACS delta: events can be CreatedEvent or ArchivedEvent
 * - ledger effects: events can be CreatedEvent or ExercisedEvent
 *
 * In the update service the events are restricted to the events
 * visible for the parties specified in the transaction filter. Each
 * event message type below contains a ``witness_parties`` field which
 * indicates the subset of the requested parties that can see the event
 * in question.
 */
export type Event = ({
    ArchivedEvent: ArchivedEvent;
} | {
    CreatedEvent: CreatedEvent;
} | {
    ExercisedEvent: ExercisedEvent;
});

