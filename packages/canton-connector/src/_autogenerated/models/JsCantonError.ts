/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Map_String } from './Map_String';
import type { Tuple2_String_String } from './Tuple2_String_String';
export type JsCantonError = {
    code: string;
    cause: string;
    correlationId?: string;
    traceId?: string;
    context: Map_String;
    resources?: Array<Tuple2_String_String>;
    errorCategory: number;
    grpcCodeValue?: number;
    retryInfo?: string;
    definiteAnswer?: boolean;
};

