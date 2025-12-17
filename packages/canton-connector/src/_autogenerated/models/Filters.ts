/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CumulativeFilter } from './CumulativeFilter';
/**
 * The union of a set of template filters, interface filters, or a wildcard.
 */
export type Filters = {
    /**
     * Every filter in the cumulative list expands the scope of the resulting stream. Each interface,
     * template or wildcard filter means additional events that will match the query.
     * The impact of include_interface_view and include_created_event_blob fields in the filters will
     * also be accumulated.
     * A template or an interface SHOULD NOT appear twice in the accumulative field.
     * A wildcard filter SHOULD NOT be defined more than once in the accumulative field.
     * Optional, if no ``CumulativeFilter`` defined, the default of a single ``WildcardFilter`` with
     * include_created_event_blob unset is used.
     */
    cumulative?: Array<CumulativeFilter>;
};

