/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ListPackagesResponse = {
    /**
     * The IDs of all Daml-LF packages supported by the server.
     * Each element must be a valid PackageIdString (as described in ``value.proto``).
     *
     * Required: must be non-empty
     */
    packageIds: Array<string>;
};

