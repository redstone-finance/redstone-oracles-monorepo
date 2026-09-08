/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VettedPackagesRef } from './VettedPackagesRef';
/**
 * Remove packages from the set of vetted packages
 */
export type Unvet1 = {
    /**
     * Packages to be unvetted.
     *
     * If a reference in this list matches multiple packages, they are all
     * unvetted.
     *
     * Required: must be non-empty
     */
    packages: Array<VettedPackagesRef>;
};

