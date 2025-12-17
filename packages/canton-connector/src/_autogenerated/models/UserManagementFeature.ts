/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserManagementFeature = {
    /**
     * Whether the Ledger API server provides the user management service.
     */
    supported: boolean;
    /**
     * The maximum number of rights that can be assigned to a single user.
     * Servers MUST support at least 100 rights per user.
     * A value of 0 means that the server enforces no rights per user limit.
     */
    maxRightsPerUser: number;
    /**
     * The maximum number of users the server can return in a single response (page).
     * Servers MUST support at least a 100 users per page.
     * A value of 0 means that the server enforces no page size limit.
     */
    maxUsersPageSize: number;
};

