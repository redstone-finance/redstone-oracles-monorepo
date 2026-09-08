/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from './User';
export type ListUsersResponse = {
    /**
     * A subset of users of the participant node that fit into this page.
     * Can be empty if no more users
     *
     * Optional: can be empty
     */
    users?: Array<User>;
    /**
     * Pagination token to retrieve the next page.
     * Empty, if there are no further results.
     *
     * Optional
     */
    nextPageToken?: string;
};

