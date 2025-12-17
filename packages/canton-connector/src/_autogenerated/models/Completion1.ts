/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeduplicationPeriod1 } from './DeduplicationPeriod1';
import type { JsStatus } from './JsStatus';
import type { SynchronizerTime } from './SynchronizerTime';
import type { TraceContext } from './TraceContext';
/**
 * A completion represents the status of a submitted command on the ledger: it can be successful or failed.
 */
export type Completion1 = {
    /**
     * The ID of the succeeded or failed command.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Required
     */
    commandId: string;
    /**
     * Identifies the exact type of the error.
     * It uses the same format of conveying error details as it is used for the RPC responses of the APIs.
     * Optional
     */
    status?: JsStatus;
    /**
     * The update_id of the transaction or reassignment that resulted from the command with command_id.
     * Only set for successfully executed commands.
     * Must be a valid LedgerString (as described in ``value.proto``).
     */
    updateId: string;
    /**
     * The user-id that was used for the submission, as described in ``commands.proto``.
     * Must be a valid UserIdString (as described in ``value.proto``).
     * Optional for historic completions where this data is not available.
     */
    userId: string;
    /**
     * The set of parties on whose behalf the commands were executed.
     * Contains the ``act_as`` parties from ``commands.proto``
     * filtered to the requesting parties in CompletionStreamRequest.
     * The order of the parties need not be the same as in the submission.
     * Each element must be a valid PartyIdString (as described in ``value.proto``).
     * Optional for historic completions where this data is not available.
     */
    actAs?: Array<string>;
    /**
     * The submission ID this completion refers to, as described in ``commands.proto``.
     * Must be a valid LedgerString (as described in ``value.proto``).
     * Optional
     */
    submissionId: string;
    deduplicationPeriod: DeduplicationPeriod1;
    /**
     * Optional; ledger API trace context
     *
     * The trace context transported in this message corresponds to the trace context supplied
     * by the client application in a HTTP2 header of the original command submission.
     * We typically use a header to transfer this type of information. Here we use message
     * body, because it is used in gRPC streams which do not support per message headers.
     * This field will be populated with the trace context contained in the original submission.
     * If that was not provided, a unique ledger-api-server generated trace context will be used
     * instead.
     */
    traceContext?: TraceContext;
    /**
     * May be used in a subsequent CompletionStreamRequest to resume the consumption of this stream at a later time.
     * Required, must be a valid absolute offset (positive integer).
     */
    offset: number;
    /**
     * The synchronizer along with its record time.
     * The synchronizer id provided, in case of
     *
     * - successful/failed transactions: identifies the synchronizer of the transaction
     * - for successful/failed unassign commands: identifies the source synchronizer
     * - for successful/failed assign commands: identifies the target synchronizer
     *
     * Required
     */
    synchronizerTime?: SynchronizerTime;
};

