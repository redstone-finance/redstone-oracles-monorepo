/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Defines a package-name for which the commonly vetted package with the highest version must be found.
 */
export type PackageVettingRequirement = {
    /**
     * The parties whose participants' vetting state should be considered when resolving the preferred package.
     * Required
     */
    parties?: Array<string>;
    /**
     * The package-name for which the preferred package should be resolved.
     * Required
     */
    packageName: string;
};

