/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExperimentalFeatures } from './ExperimentalFeatures';
import type { OffsetCheckpointFeature } from './OffsetCheckpointFeature';
import type { PackageFeature } from './PackageFeature';
import type { PartyManagementFeature } from './PartyManagementFeature';
import type { UserManagementFeature } from './UserManagementFeature';
export type FeaturesDescriptor = {
    /**
     * Features under development or features that are used
     * for ledger implementation testing purposes only.
     *
     * Daml applications SHOULD not depend on these in production.
     */
    experimental?: ExperimentalFeatures;
    /**
     * If set, then the Ledger API server supports user management.
     * It is recommended that clients query this field to gracefully adjust their behavior for
     * ledgers that do not support user management.
     */
    userManagement?: UserManagementFeature;
    /**
     * If set, then the Ledger API server supports party management configurability.
     * It is recommended that clients query this field to gracefully adjust their behavior to
     * maximum party page size.
     */
    partyManagement?: PartyManagementFeature;
    /**
     * It contains the timeouts related to the periodic offset checkpoint emission
     */
    offsetCheckpoint?: OffsetCheckpointFeature;
    /**
     * If set, then the Ledger API server supports package listing
     * configurability. It is recommended that clients query this field to
     * gracefully adjust their behavior to maximum package listing page size.
     */
    packageFeature?: PackageFeature;
};

