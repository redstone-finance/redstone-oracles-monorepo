/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VettedPackages } from './VettedPackages';
export type UpdateVettedPackagesResponse = {
    /**
     * All vetted packages on this participant and synchronizer, before the
     * specified changes. Empty if no vetting state existed beforehand.
     */
    pastVettedPackages?: VettedPackages;
    /**
     * All vetted packages on this participant and synchronizer, after the specified changes.
     */
    newVettedPackages?: VettedPackages;
};

