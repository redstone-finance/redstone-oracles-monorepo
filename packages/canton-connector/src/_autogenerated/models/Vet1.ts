/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VettedPackagesRef } from './VettedPackagesRef';
/**
 * Set vetting bounds of a list of packages. Packages that were not previously
 * vetted have their bounds added, previous vetting bounds are overwritten.
 */
export type Vet1 = {
    /**
     * Packages to be vetted.
     *
     * If a reference in this list matches more than one package, the change is
     * considered ambiguous and the entire update request is rejected. In other
     * words, every reference must match exactly one package.
     *
     * Required: must be non-empty
     */
    packages: Array<VettedPackagesRef>;
    /**
     * The time from which these packages should be vetted, prior lower bounds
     * are overwritten.
     * Optional
     */
    newValidFromInclusive?: string;
    /**
     * The time until which these packages should be vetted, prior upper bounds
     * are overwritten.
     * Optional
     */
    newValidUntilExclusive?: string;
};

