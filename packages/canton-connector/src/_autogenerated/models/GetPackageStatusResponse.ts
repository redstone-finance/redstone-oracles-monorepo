/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GetPackageStatusResponse = {
    /**
     * The status of the package.
     */
    packageStatus: GetPackageStatusResponse.packageStatus;
};
export namespace GetPackageStatusResponse {
    /**
     * The status of the package.
     */
    export enum packageStatus {
        PACKAGE_STATUS_UNSPECIFIED = 'PACKAGE_STATUS_UNSPECIFIED',
        PACKAGE_STATUS_REGISTERED = 'PACKAGE_STATUS_REGISTERED',
    }
}

