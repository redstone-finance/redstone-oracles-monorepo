/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VettedPackages } from './VettedPackages';
export type UpdateVettedPackagesResponse = {
    /**
     * All vetted packages on this participant and synchronizer, before the
     * specified changes. Empty if no vetting state existed beforehand.
     *
     * Not populated if no vetted topology state exists prior to the update.
     *
     * Optional
     */
    pastVettedPackages?: VettedPackages;
    /**
     * All vetted packages on this participant and synchronizer, after the specified changes.
     *
     * Required
     */
    newVettedPackages: VettedPackages;
};

