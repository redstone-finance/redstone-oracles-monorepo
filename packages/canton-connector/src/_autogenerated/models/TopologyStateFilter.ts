/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Filter the vetted packages by the participant and synchronizer that they are
 * hosted on.
 *
 * Empty fields are ignored, such that a ``TopologyStateFilter`` without
 * participant_ids and without synchronizer_ids matches a vetted package hosted
 * on any participant and synchronizer.
 *
 * Non-empty fields specify candidate values of which at least one must match.
 * If both fields are set then at least one candidate value must match from each
 * field.
 */
export type TopologyStateFilter = {
    /**
     * If this list is non-empty, only vetted packages hosted on participants
     * listed in this field match the filter.
     * Query the current Ledger API's participant's ID via the public
     * ``GetParticipantId`` command in ``PartyManagementService``.
     */
    participantIds?: Array<string>;
    /**
     * If this list is non-empty, only vetted packages from the topology state of
     * the synchronizers in this list match the filter.
     */
    synchronizerIds?: Array<string>;
};

