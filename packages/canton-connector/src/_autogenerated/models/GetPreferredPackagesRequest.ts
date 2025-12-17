/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PackageVettingRequirement } from './PackageVettingRequirement';
export type GetPreferredPackagesRequest = {
    /**
     * The package-name vetting requirements for which the preferred packages should be resolved.
     *
     * Generally it is enough to provide the requirements for the intended command's root package-names.
     * Additional package-name requirements can be provided when additional Daml transaction informees need to use
     * package dependencies of the command's root packages.
     *
     * Required
     */
    packageVettingRequirements?: Array<PackageVettingRequirement>;
    /**
     * The synchronizer whose vetting state should be used for resolving this query.
     * If not specified, the vetting states of all synchronizers to which the participant is connected are used.
     * Optional
     */
    synchronizerId: string;
    /**
     * The timestamp at which the package vetting validity should be computed
     * on the latest topology snapshot as seen by the participant.
     * If not provided, the participant's current clock time is used.
     * Optional
     */
    vettingValidAt?: string;
};

