/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A package that is vetting on a given participant and synchronizer,
 * modelled after ``VettedPackage`` in `topology.proto <https://github.com/digital-asset/canton/blob/main/community/base/src/main/protobuf/com/digitalasset/canton/protocol/v30/topology.proto#L206>`_,
 * enriched with the package name and version.
 */
export type VettedPackage = {
    /**
     * Package ID of this package. Always present.
     */
    packageId: string;
    /**
     * The time from which this package is vetted. Empty if vetting time has no
     * lower bound.
     */
    validFromInclusive?: string;
    /**
     * The time until which this package is vetted. Empty if vetting time has no
     * upper bound.
     */
    validUntilExclusive?: string;
    /**
     * Name of this package.
     * Only available if the package has been uploaded to the current participant.
     * If unavailable, is empty string.
     */
    packageName: string;
    /**
     * Version of this package.
     * Only available if the package has been uploaded to the current participant.
     * If unavailable, is empty string.
     */
    packageVersion: string;
};

