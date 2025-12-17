/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A reference to identify one or more packages.
 *
 * A reference matches a package if its ``package_id`` matches the package's ID,
 * its ``package_name`` matches the package's name, and its ``package_version``
 * matches the package's version. If an attribute in the reference is left
 * unspecified (i.e. as an empty string), that attribute is treated as a
 * wildcard. At a minimum, ``package_id`` or the ``package_name`` must be
 * specified.
 *
 * If a reference does not match any package, the reference is considered
 * unresolved and the entire update request is rejected.
 */
export type VettedPackagesRef = {
    /**
     * Package's package id must be the same as this field.
     * Optional
     */
    packageId: string;
    /**
     * Package's name must be the same as this field.
     * Optional
     */
    packageName: string;
    /**
     * Package's version must be the same as this field.
     * Optional
     */
    packageVersion: string;
};

