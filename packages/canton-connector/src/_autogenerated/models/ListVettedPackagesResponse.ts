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
     *
     * Optional: can be empty
     */
    vettedPackages?: Array<VettedPackages>;
    /**
     * Pagination token to retrieve the next page.
     * Empty string once there are no further results.
     *
     * ``PackageMetadataFilter`` is applied after ``TopologyStateFilter`` has already produced a page,
     * so that page can end up empty even when it has a next token. Keep following the token until
     * there's no token left.
     *
     * Optional
     */
    nextPageToken?: string;
};

