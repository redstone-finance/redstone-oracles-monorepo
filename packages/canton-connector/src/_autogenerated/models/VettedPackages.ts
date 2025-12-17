/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VettedPackage } from './VettedPackage';
/**
 * The list of packages vetted on a given participant and synchronizer, modelled
 * after ``VettedPackages`` in `topology.proto <https://github.com/digital-asset/canton/blob/main/community/base/src/main/protobuf/com/digitalasset/canton/protocol/v30/topology.proto#L206>`_.
 * The list only contains packages that matched a filter in the query that
 * originated it.
 */
export type VettedPackages = {
    /**
     * Sorted by package_name and package_version where known, and package_id as a
     * last resort.
     */
    packages?: Array<VettedPackage>;
    /**
     * Participant on which these packages are vetted. Always present.
     */
    participantId: string;
    /**
     * Synchronizer on which these packages are vetted. Always present.
     */
    synchronizerId: string;
    /**
     * Serial of last ``VettedPackages`` topology transaction of this participant
     * and on this synchronizer. Always present.
     */
    topologySerial: number;
};

