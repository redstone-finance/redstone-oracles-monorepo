/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PackageMetadataFilter } from './PackageMetadataFilter';
import type { TopologyStateFilter } from './TopologyStateFilter';
export type ListVettedPackagesRequest = {
    /**
     * The package metadata filter the returned vetted packages set must satisfy.
     * Optional
     */
    packageMetadataFilter?: PackageMetadataFilter;
    /**
     * The topology filter the returned vetted packages set must satisfy.
     * Optional
     */
    topologyStateFilter?: TopologyStateFilter;
    /**
     * Pagination token to determine the specific page to fetch. Using the token
     * guarantees that ``VettedPackages`` on a subsequent page are all greater
     * (``VettedPackages`` are sorted by synchronizer ID then participant ID) than
     * the last ``VettedPackages`` on a previous page.
     *
     * The server does not store intermediate results between calls chained by a
     * series of page tokens. As a consequence, if new vetted packages are being
     * added and a page is requested twice using the same token, more packages can
     * be returned on the second call.
     *
     * Leave unspecified (i.e. as empty string) to fetch the first page.
     *
     * Optional
     */
    pageToken: string;
    /**
     * Maximum number of ``VettedPackages`` results to return in a single page.
     *
     * If the page_size is unspecified (i.e. left as 0), the server will decide
     * the number of results to be returned.
     *
     * If the page_size exceeds the maximum supported by the server, an
     * error will be returned.
     *
     * To obtain the server's maximum consult the PackageService descriptor
     * available in the VersionService.
     *
     * Optional
     */
    pageSize: number;
};

