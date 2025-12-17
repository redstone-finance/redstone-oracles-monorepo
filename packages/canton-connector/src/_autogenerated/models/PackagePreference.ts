/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PackageReference } from './PackageReference';
export type PackagePreference = {
    /**
     * The package reference of the preferred package.
     * Required
     */
    packageReference?: PackageReference;
    /**
     * The synchronizer for which the preferred package was computed.
     * If the synchronizer_id was specified in the request, then it matches the request synchronizer_id.
     * Required
     */
    synchronizerId: string;
};

