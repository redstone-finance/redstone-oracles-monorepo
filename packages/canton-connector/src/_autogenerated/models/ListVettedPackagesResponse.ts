/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VettedPackages } from './VettedPackages';
export type ListVettedPackagesResponse = {
    /**
     * All ``VettedPackages`` that contain at least one ``VettedPackage`` matching
     * both a ``PackageMetadataFilter`` and a ``TopologyStateFilter``.
     * Sorted by synchronizer_id then participant_id.
     */
    vettedPackages?: Array<VettedPackages>;
    /**
     * Pagination token to retrieve the next page.
     * Empty string if there are no further results.
     */
    nextPageToken: string;
};

