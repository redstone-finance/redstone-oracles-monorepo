/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PriorTopologySerial } from './PriorTopologySerial';
import type { VettedPackagesChange } from './VettedPackagesChange';
export type UpdateVettedPackagesRequest = {
    /**
     * Changes to apply to the current vetting state of the participant on the
     * specified synchronizer. The changes are applied in order.
     * Any package not changed will keep their previous vetting state.
     */
    changes?: Array<VettedPackagesChange>;
    /**
     * If dry_run is true, then the changes are only prepared, but not applied. If
     * a request would trigger an error when run (e.g. TOPOLOGY_DEPENDENCIES_NOT_VETTED),
     * it will also trigger an error when dry_run.
     *
     * Use this flag to preview a change before applying it.
     */
    dryRun: boolean;
    /**
     * If set, the requested changes will take place on the specified
     * synchronizer. If synchronizer_id is unset and the participant is only
     * connected to a single synchronizer, that synchronizer will be used by
     * default. If synchronizer_id is unset and the participant is connected to
     * multiple synchronizers, the request will error out with
     * PACKAGE_SERVICE_CANNOT_AUTODETECT_SYNCHRONIZER.
     *
     * Optional
     */
    synchronizerId: string;
    /**
     * The serial of the last ``VettedPackages`` topology transaction of this
     * participant and on this synchronizer.
     *
     * Execution of the request fails if this is not correct. Use this to guard
     * against concurrent changes.
     *
     * If left unspecified, no validation is done against the last transaction's
     * serial.
     *
     * Optional
     */
    expectedTopologySerial?: PriorTopologySerial;
    /**
     * Controls whether potentially unsafe vetting updates are allowed.
     *
     * Optional, defaults to FORCE_FLAG_UNSPECIFIED.
     */
    updateVettedPackagesForceFlags?: Array<'UPDATE_VETTED_PACKAGES_FORCE_FLAG_UNSPECIFIED' | 'UPDATE_VETTED_PACKAGES_FORCE_FLAG_ALLOW_VET_INCOMPATIBLE_UPGRADES' | 'UPDATE_VETTED_PACKAGES_FORCE_FLAG_ALLOW_UNVETTED_DEPENDENCIES'>;
};

