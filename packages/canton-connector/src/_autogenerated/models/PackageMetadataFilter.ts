/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Filter the VettedPackages by package metadata.
 *
 * A PackageMetadataFilter without package_ids and without package_name_prefixes
 * matches any vetted package.
 *
 * Non-empty fields specify candidate values of which at least one must match.
 * If both fields are set, then a candidate is returned if it matches one of the fields.
 */
export type PackageMetadataFilter = {
    /**
     * If this list is non-empty, any vetted package with a package ID in this
     * list will match the filter.
     */
    packageIds?: Array<string>;
    /**
     * If this list is non-empty, any vetted package with a name matching at least
     * one prefix in this list will match the filter.
     */
    packageNamePrefixes?: Array<string>;
};

