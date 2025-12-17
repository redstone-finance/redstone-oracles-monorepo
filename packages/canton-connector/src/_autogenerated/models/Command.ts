/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateAndExerciseCommand } from './CreateAndExerciseCommand';
import type { CreateCommand } from './CreateCommand';
import type { ExerciseByKeyCommand } from './ExerciseByKeyCommand';
import type { ExerciseCommand } from './ExerciseCommand';
/**
 * A command can either create a new contract or exercise a choice on an existing contract.
 */
export type Command = ({
    CreateAndExerciseCommand: CreateAndExerciseCommand;
} | {
    CreateCommand: CreateCommand;
} | {
    ExerciseByKeyCommand: ExerciseByKeyCommand;
} | {
    ExerciseCommand: ExerciseCommand;
});

