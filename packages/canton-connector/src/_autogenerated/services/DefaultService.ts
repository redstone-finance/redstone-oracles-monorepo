/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AllocateExternalPartyRequest } from '../models/AllocateExternalPartyRequest';
import type { AllocateExternalPartyResponse } from '../models/AllocateExternalPartyResponse';
import type { AllocatePartyRequest } from '../models/AllocatePartyRequest';
import type { AllocatePartyResponse } from '../models/AllocatePartyResponse';
import type { CompletionStreamRequest } from '../models/CompletionStreamRequest';
import type { CompletionStreamResponse } from '../models/CompletionStreamResponse';
import type { CreateIdentityProviderConfigRequest } from '../models/CreateIdentityProviderConfigRequest';
import type { CreateIdentityProviderConfigResponse } from '../models/CreateIdentityProviderConfigResponse';
import type { CreateUserRequest } from '../models/CreateUserRequest';
import type { CreateUserResponse } from '../models/CreateUserResponse';
import type { DeleteIdentityProviderConfigResponse } from '../models/DeleteIdentityProviderConfigResponse';
import type { ExecuteSubmissionAndWaitResponse } from '../models/ExecuteSubmissionAndWaitResponse';
import type { ExecuteSubmissionResponse } from '../models/ExecuteSubmissionResponse';
import type { GenerateExternalPartyTopologyRequest } from '../models/GenerateExternalPartyTopologyRequest';
import type { GenerateExternalPartyTopologyResponse } from '../models/GenerateExternalPartyTopologyResponse';
import type { GetActiveContractsPageRequest } from '../models/GetActiveContractsPageRequest';
import type { GetActiveContractsRequest } from '../models/GetActiveContractsRequest';
import type { GetCompletionsRequest } from '../models/GetCompletionsRequest';
import type { GetConnectedSynchronizersResponse } from '../models/GetConnectedSynchronizersResponse';
import type { GetContractRequest } from '../models/GetContractRequest';
import type { GetContractResponse } from '../models/GetContractResponse';
import type { GetEventsByContractIdRequest } from '../models/GetEventsByContractIdRequest';
import type { GetIdentityProviderConfigResponse } from '../models/GetIdentityProviderConfigResponse';
import type { GetLatestPrunedOffsetsResponse } from '../models/GetLatestPrunedOffsetsResponse';
import type { GetLedgerApiVersionResponse } from '../models/GetLedgerApiVersionResponse';
import type { GetLedgerEndResponse } from '../models/GetLedgerEndResponse';
import type { GetPackageStatusResponse } from '../models/GetPackageStatusResponse';
import type { GetParticipantIdResponse } from '../models/GetParticipantIdResponse';
import type { GetPartiesResponse } from '../models/GetPartiesResponse';
import type { GetPreferredPackagesRequest } from '../models/GetPreferredPackagesRequest';
import type { GetPreferredPackagesResponse } from '../models/GetPreferredPackagesResponse';
import type { GetPreferredPackageVersionResponse } from '../models/GetPreferredPackageVersionResponse';
import type { GetTransactionByIdRequest } from '../models/GetTransactionByIdRequest';
import type { GetTransactionByOffsetRequest } from '../models/GetTransactionByOffsetRequest';
import type { GetUpdateByIdRequest } from '../models/GetUpdateByIdRequest';
import type { GetUpdateByOffsetRequest } from '../models/GetUpdateByOffsetRequest';
import type { GetUpdatesPageRequest } from '../models/GetUpdatesPageRequest';
import type { GetUpdatesRequest } from '../models/GetUpdatesRequest';
import type { GetUserResponse } from '../models/GetUserResponse';
import type { GrantUserRightsRequest } from '../models/GrantUserRightsRequest';
import type { GrantUserRightsResponse } from '../models/GrantUserRightsResponse';
import type { JsCantonError } from '../models/JsCantonError';
import type { JsCommands } from '../models/JsCommands';
import type { JsExecuteSubmissionAndWaitForTransactionRequest } from '../models/JsExecuteSubmissionAndWaitForTransactionRequest';
import type { JsExecuteSubmissionAndWaitForTransactionResponse } from '../models/JsExecuteSubmissionAndWaitForTransactionResponse';
import type { JsExecuteSubmissionAndWaitRequest } from '../models/JsExecuteSubmissionAndWaitRequest';
import type { JsExecuteSubmissionRequest } from '../models/JsExecuteSubmissionRequest';
import type { JsGetActiveContractsPageResponse } from '../models/JsGetActiveContractsPageResponse';
import type { JsGetActiveContractsResponse } from '../models/JsGetActiveContractsResponse';
import type { JsGetEventsByContractIdResponse } from '../models/JsGetEventsByContractIdResponse';
import type { JsGetTransactionResponse } from '../models/JsGetTransactionResponse';
import type { JsGetTransactionTreeResponse } from '../models/JsGetTransactionTreeResponse';
import type { JsGetUpdateResponse } from '../models/JsGetUpdateResponse';
import type { JsGetUpdatesPageResponse } from '../models/JsGetUpdatesPageResponse';
import type { JsGetUpdatesResponse } from '../models/JsGetUpdatesResponse';
import type { JsGetUpdateTreesResponse } from '../models/JsGetUpdateTreesResponse';
import type { JsPrepareSubmissionRequest } from '../models/JsPrepareSubmissionRequest';
import type { JsPrepareSubmissionResponse } from '../models/JsPrepareSubmissionResponse';
import type { JsSubmitAndWaitForReassignmentResponse } from '../models/JsSubmitAndWaitForReassignmentResponse';
import type { JsSubmitAndWaitForTransactionRequest } from '../models/JsSubmitAndWaitForTransactionRequest';
import type { JsSubmitAndWaitForTransactionResponse } from '../models/JsSubmitAndWaitForTransactionResponse';
import type { JsSubmitAndWaitForTransactionTreeResponse } from '../models/JsSubmitAndWaitForTransactionTreeResponse';
import type { ListIdentityProviderConfigsResponse } from '../models/ListIdentityProviderConfigsResponse';
import type { ListKnownPartiesResponse } from '../models/ListKnownPartiesResponse';
import type { ListPackagesResponse } from '../models/ListPackagesResponse';
import type { ListUserRightsResponse } from '../models/ListUserRightsResponse';
import type { ListUsersResponse } from '../models/ListUsersResponse';
import type { ListVettedPackagesRequest } from '../models/ListVettedPackagesRequest';
import type { ListVettedPackagesResponse } from '../models/ListVettedPackagesResponse';
import type { RevokeUserRightsRequest } from '../models/RevokeUserRightsRequest';
import type { RevokeUserRightsResponse } from '../models/RevokeUserRightsResponse';
import type { SubmitAndWaitForReassignmentRequest } from '../models/SubmitAndWaitForReassignmentRequest';
import type { SubmitAndWaitResponse } from '../models/SubmitAndWaitResponse';
import type { SubmitReassignmentRequest } from '../models/SubmitReassignmentRequest';
import type { SubmitReassignmentResponse } from '../models/SubmitReassignmentResponse';
import type { SubmitResponse } from '../models/SubmitResponse';
import type { UpdateIdentityProviderConfigRequest } from '../models/UpdateIdentityProviderConfigRequest';
import type { UpdateIdentityProviderConfigResponse } from '../models/UpdateIdentityProviderConfigResponse';
import type { UpdatePartyDetailsRequest } from '../models/UpdatePartyDetailsRequest';
import type { UpdatePartyDetailsResponse } from '../models/UpdatePartyDetailsResponse';
import type { UpdateUserIdentityProviderIdRequest } from '../models/UpdateUserIdentityProviderIdRequest';
import type { UpdateUserIdentityProviderIdResponse } from '../models/UpdateUserIdentityProviderIdResponse';
import type { UpdateUserRequest } from '../models/UpdateUserRequest';
import type { UpdateUserResponse } from '../models/UpdateUserResponse';
import type { UpdateVettedPackagesRequest } from '../models/UpdateVettedPackagesRequest';
import type { UpdateVettedPackagesResponse } from '../models/UpdateVettedPackagesResponse';
import type { UploadDarFileResponse } from '../models/UploadDarFileResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Submits a single composite command and waits for its result.
     * Propagates the gRPC error of failed submissions including Daml interpretation errors.
     * @param requestBody
     * @returns SubmitAndWaitResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsSubmitAndWait(
        requestBody: JsCommands,
    ): CancelablePromise<SubmitAndWaitResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/submit-and-wait',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Submits a single composite command, waits for its result, and returns the transaction.
     * Propagates the gRPC error of failed submissions including Daml interpretation errors.
     * @param requestBody
     * @returns JsSubmitAndWaitForTransactionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsSubmitAndWaitForTransaction(
        requestBody: JsSubmitAndWaitForTransactionRequest,
    ): CancelablePromise<JsSubmitAndWaitForTransactionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/submit-and-wait-for-transaction',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Submits a single composite reassignment command, waits for its result, and returns the reassignment.
     * Propagates the gRPC error of failed submission.
     * @param requestBody
     * @returns JsSubmitAndWaitForReassignmentResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsSubmitAndWaitForReassignment(
        requestBody: SubmitAndWaitForReassignmentRequest,
    ): CancelablePromise<JsSubmitAndWaitForReassignmentResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/submit-and-wait-for-reassignment',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * @deprecated
     * Submit a batch of commands and wait for the transaction trees response. Provided for backwards compatibility, it will be removed in the Canton version 3.5.0, use submit-and-wait-for-transaction instead.
     * @param requestBody
     * @returns JsSubmitAndWaitForTransactionTreeResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsSubmitAndWaitForTransactionTree(
        requestBody: JsCommands,
    ): CancelablePromise<JsSubmitAndWaitForTransactionTreeResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/submit-and-wait-for-transaction-tree',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Submit a single composite command.
     * @param requestBody
     * @returns SubmitResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsAsyncSubmit(
        requestBody: JsCommands,
    ): CancelablePromise<SubmitResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/async/submit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Submit a single reassignment.
     * @param requestBody
     * @returns SubmitReassignmentResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsAsyncSubmitReassignment(
        requestBody: SubmitReassignmentRequest,
    ): CancelablePromise<SubmitReassignmentResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/async/submit-reassignment',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Query completions list (blocking call)
     *
     * Deprecated: please use ``GetCompletions`` instead.
     * Subscribe to command completion events.
     * Notice: This endpoint should be used for small results set.
     * When number of results exceeded node configuration limit (`http-list-max-elements-limit`)
     * there will be an error (`413 Content Too Large`) returned.
     * Increasing this limit may lead to performance issues and high memory consumption.
     * Consider using websockets (asyncapi) for better efficiency with larger results.
     * @param requestBody
     * @param limit maximum number of elements to return, this param is ignored if is bigger than server setting
     * @param streamIdleTimeoutMs timeout to complete and send result if no new elements are received (for open ended streams)
     * @returns CompletionStreamResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsCompletions(
        requestBody: CompletionStreamRequest,
        limit?: number,
        streamIdleTimeoutMs?: number,
    ): CancelablePromise<Array<CompletionStreamResponse> | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/completions',
            query: {
                'limit': limit,
                'stream_idle_timeout_ms': streamIdleTimeoutMs,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms`,
            },
        });
    }
    /**
     * Query completions list (blocking call)
     *
     * Subscribe to command completion events.
     * This streaming endpoint provides more flexibility in filtering than the predecessor ``CompletionStream``.
     * Notice: This endpoint should be used for small results set.
     * When number of results exceeded node configuration limit (`http-list-max-elements-limit`)
     * there will be an error (`413 Content Too Large`) returned.
     * Increasing this limit may lead to performance issues and high memory consumption.
     * Consider using websockets (asyncapi) for better efficiency with larger results.
     * @param requestBody
     * @param limit maximum number of elements to return, this param is ignored if is bigger than server setting
     * @param streamIdleTimeoutMs timeout to complete and send result if no new elements are received (for open ended streams)
     * @returns CompletionStreamResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2CommandsCommandCompletions(
        requestBody: GetCompletionsRequest,
        limit?: number,
        streamIdleTimeoutMs?: number,
    ): CancelablePromise<Array<CompletionStreamResponse> | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/commands/command-completions',
            query: {
                'limit': limit,
                'stream_idle_timeout_ms': streamIdleTimeoutMs,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms`,
            },
        });
    }
    /**
     * Get the create and the consuming exercise event for the contract with the provided ID.
     * No events will be returned for contracts that have been pruned because they
     * have already been archived before the latest pruning offset.
     * If the contract cannot be found for the request, or all the contract-events are filtered, a CONTRACT_EVENTS_NOT_FOUND error will be raised.
     * @param requestBody
     * @returns JsGetEventsByContractIdResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2EventsEventsByContractId(
        requestBody: GetEventsByContractIdRequest,
    ): CancelablePromise<JsGetEventsByContractIdResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/events/events-by-contract-id',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Read the Ledger API version
     * @returns GetLedgerApiVersionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Version(): CancelablePromise<GetLedgerApiVersionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/version',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Validates the DAR and checks the upgrade compatibility of the DAR's packages
     * with the set of the already vetted packages on the target vetting synchronizer.
     * See ValidateDarFileRequest for details regarding the target vetting synchronizer.
     *
     * The operation has no effect on the state of the participant or the Canton ledger:
     * the DAR payload and its packages are not persisted neither are the packages vetted.
     * @param requestBody
     * @param synchronizerId
     * @returns any
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2DarsValidate(
        requestBody: Blob,
        synchronizerId?: string,
    ): CancelablePromise<any | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/dars/validate',
            query: {
                'synchronizerId': synchronizerId,
            },
            body: requestBody,
            mediaType: 'application/octet-stream',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter synchronizerId`,
            },
        });
    }
    /**
     * Upload a DAR to the participant node
     * @param requestBody
     * @param vetAllPackages
     * @param synchronizerId
     * @returns UploadDarFileResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2Dars(
        requestBody: Blob,
        vetAllPackages?: boolean,
        synchronizerId?: string,
    ): CancelablePromise<UploadDarFileResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/dars',
            query: {
                'vetAllPackages': vetAllPackages,
                'synchronizerId': synchronizerId,
            },
            body: requestBody,
            mediaType: 'application/octet-stream',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter vetAllPackages, Invalid value for: query parameter synchronizerId`,
            },
        });
    }
    /**
     * Returns the identifiers of all supported packages.
     * @returns ListPackagesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Packages(): CancelablePromise<ListPackagesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/packages',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Behaves the same as /dars. This endpoint will be deprecated and removed in a future release.
     * Upload a DAR file to the participant.
     *
     * If vetting is enabled in the request, the DAR is checked for upgrade compatibility
     * with the set of the already vetted packages on the target vetting synchronizer
     * See UploadDarFileRequest for details regarding vetting and the target vetting synchronizer.
     * @param requestBody
     * @param vetAllPackages
     * @param synchronizerId
     * @returns UploadDarFileResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2Packages(
        requestBody: Blob,
        vetAllPackages?: boolean,
        synchronizerId?: string,
    ): CancelablePromise<UploadDarFileResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/packages',
            query: {
                'vetAllPackages': vetAllPackages,
                'synchronizerId': synchronizerId,
            },
            body: requestBody,
            mediaType: 'application/octet-stream',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter vetAllPackages, Invalid value for: query parameter synchronizerId`,
            },
        });
    }
    /**
     * Returns the contents of a single package.
     * @param packageId
     * @returns binary
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2PackagesPackageId(
        packageId: string,
    ): CancelablePromise<Blob | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/packages/{package-id}',
            path: {
                'package-id': packageId,
            },
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Returns the status of a single package.
     * @param packageId
     * @returns GetPackageStatusResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2PackagesPackageIdStatus(
        packageId: string,
    ): CancelablePromise<GetPackageStatusResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/packages/{package-id}/status',
            path: {
                'package-id': packageId,
            },
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * @deprecated
     * Lists which participant node vetted what packages on which synchronizer.
     * This endpoint (GET /package-vetting) is deprecated and will be removed in a future release. Please use POST /package-vetting/list instead.
     * @param requestBody
     * @returns ListVettedPackagesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2PackageVetting(
        requestBody: ListVettedPackagesRequest,
    ): CancelablePromise<ListVettedPackagesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/package-vetting',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * @deprecated
     * Update the vetted packages of this participant
     * This endpoint (POST /package-vetting) is deprecated and will be removed in a future release. Please use POST /package-vetting/update instead.
     * @param requestBody
     * @returns UpdateVettedPackagesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2PackageVetting(
        requestBody: UpdateVettedPackagesRequest,
    ): CancelablePromise<UpdateVettedPackagesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/package-vetting',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Lists which participant node vetted what packages on which synchronizer.
     * Can be called by any authenticated user.
     * @param requestBody
     * @returns ListVettedPackagesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2PackageVettingList(
        requestBody: ListVettedPackagesRequest,
    ): CancelablePromise<ListVettedPackagesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/package-vetting/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Update the vetted packages of this participant
     * @param requestBody
     * @returns UpdateVettedPackagesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2PackageVettingUpdate(
        requestBody: UpdateVettedPackagesRequest,
    ): CancelablePromise<UpdateVettedPackagesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/package-vetting/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * List the parties known by the participant.
     * The list returned contains parties whose ledger access is facilitated by
     * the participant and the ones maintained elsewhere.
     * @param identityProviderId
     * @param filterParty
     * @param pageSize maximum number of elements in a returned page
     * @param pageToken token - to continue results from a given page, leave empty to start from the beginning of the list, obtain token from the result of previous page
     * @returns ListKnownPartiesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Parties(
        identityProviderId?: string,
        filterParty?: string,
        pageSize?: number,
        pageToken?: string,
    ): CancelablePromise<ListKnownPartiesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/parties',
            query: {
                'identity-provider-id': identityProviderId,
                'filter-party': filterParty,
                'pageSize': pageSize,
                'pageToken': pageToken,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter identity-provider-id, Invalid value for: query parameter filter-party, Invalid value for: query parameter pageSize, Invalid value for: query parameter pageToken`,
            },
        });
    }
    /**
     * Allocates a new party on a ledger and adds it to the set managed by the participant.
     * Caller specifies a party identifier suggestion, the actual identifier
     * allocated might be different and is implementation specific.
     * Caller can specify party metadata that is stored locally on the participant.
     * This call may:
     *
     * - Succeed, in which case the actual allocated identifier is visible in
     * the response.
     * - Respond with a gRPC error
     *
     * daml-on-kv-ledger: suggestion's uniqueness is checked by the validators in
     * the consensus layer and call rejected if the identifier is already present.
     * canton: completely different globally unique identifier is allocated.
     * Behind the scenes calls to an internal protocol are made. As that protocol
     * is richer than the surface protocol, the arguments take implicit values
     * The party identifier suggestion must be a valid party name. Party names are required to be non-empty US-ASCII strings built from letters, digits, space,
     * colon, minus and underscore limited to 255 chars
     * @param requestBody
     * @returns AllocatePartyResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2Parties(
        requestBody: AllocatePartyRequest,
    ): CancelablePromise<AllocatePartyResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/parties',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * The external party must be hosted (at least) on this node with either confirmation or observation permissions
     * It can optionally be hosted on other nodes (then called a multi-hosted party).
     * If hosted on additional nodes, explicit authorization of the hosting relationship must be performed on those nodes
     * before the party can be used.
     * Decentralized namespaces are supported but must be provided fully authorized by their owners.
     * The individual owner namespace transactions can be submitted in the same call (fully authorized as well).
     * In the simple case of a non-multi hosted, non-decentralized party, the RPC will return once the party is
     * effectively allocated and ready to use, similarly to the AllocateParty behavior.
     * For more complex scenarios applications may need to query the party status explicitly (only through the admin API as of now).
     * @param requestBody
     * @returns AllocateExternalPartyResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2PartiesExternalAllocate(
        requestBody: AllocateExternalPartyRequest,
    ): CancelablePromise<AllocateExternalPartyResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/parties/external/allocate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Return the identifier of the participant.
     * All horizontally scaled replicas should return the same id.
     * daml-on-kv-ledger: returns an identifier supplied on command line at launch time
     * canton: returns globally unique identifier of the participant
     * @returns GetParticipantIdResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2PartiesParticipantId(): CancelablePromise<GetParticipantIdResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/parties/participant-id',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Get the party details of the given parties. Only known parties will be
     * returned in the list.
     * @param party
     * @param identityProviderId
     * @param parties
     * @returns GetPartiesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2PartiesParty(
        party: string,
        identityProviderId?: string,
        parties?: Array<string>,
    ): CancelablePromise<GetPartiesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/parties/{party}',
            path: {
                'party': party,
            },
            query: {
                'identity-provider-id': identityProviderId,
                'parties': parties,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter identity-provider-id, Invalid value for: query parameter parties`,
            },
        });
    }
    /**
     * Update selected modifiable participant-local attributes of a party details resource.
     * Can update the participant's local information for local parties.
     * @param party
     * @param requestBody
     * @returns UpdatePartyDetailsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static patchV2PartiesParty(
        party: string,
        requestBody: UpdatePartyDetailsRequest,
    ): CancelablePromise<UpdatePartyDetailsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/v2/parties/{party}',
            path: {
                'party': party,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * You may use this endpoint to generate the common external topology transactions
     * which can be signed externally and uploaded as part of the allocate party process
     *
     * Note that this request will create a normal namespace using the same key for the
     * identity as for signing. More elaborate schemes such as multi-signature
     * or decentralized parties require you to construct the topology transactions yourself.
     * @param requestBody
     * @returns GenerateExternalPartyTopologyResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2PartiesExternalGenerateTopology(
        requestBody: GenerateExternalPartyTopologyRequest,
    ): CancelablePromise<GenerateExternalPartyTopologyResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/parties/external/generate-topology',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Query active contracts list (blocking call).
     * Querying active contracts is an expensive operation and if possible should not be repeated often.
     * Consider querying active contracts initially (for a given offset)
     * and then repeatedly call one of `/v2/updates/...`endpoints  to get subsequent modifications.
     * You can also use websockets to get updates with better performance.
     *
     * Returns a stream of the snapshot of the active contracts and incomplete (un)assignments at a ledger offset.
     * Once the stream of GetActiveContractsResponses completes,
     * the client SHOULD begin streaming updates from the update service,
     * starting at the GetActiveContractsRequest.active_at_offset specified in this request.
     * Clients SHOULD NOT assume that the set of active contracts they receive reflects the state at the ledger end.
     *
     * Notice: This endpoint should be used for small results set.
     * When number of results exceeded node configuration limit (`http-list-max-elements-limit`)
     * there will be an error (`413 Content Too Large`) returned.
     * Increasing this limit may lead to performance issues and high memory consumption.
     * Consider using websockets (asyncapi) for better efficiency with larger results.
     * @param requestBody
     * @param limit maximum number of elements to return, this param is ignored if is bigger than server setting
     * @param streamIdleTimeoutMs timeout to complete and send result if no new elements are received (for open ended streams)
     * @returns JsGetActiveContractsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2StateActiveContracts(
        requestBody: GetActiveContractsRequest,
        limit?: number,
        streamIdleTimeoutMs?: number,
    ): CancelablePromise<Array<JsGetActiveContractsResponse> | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/state/active-contracts',
            query: {
                'limit': limit,
                'stream_idle_timeout_ms': streamIdleTimeoutMs,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms`,
            },
        });
    }
    /**
     * Returns a page of the snapshot of the active contracts and incomplete (un)assignments at a ledger offset.
     * Once all pages are fetched by repeated calls to ``GetActiveContractsPage``,
     * the client SHOULD begin retrieving updates from the update service,
     * starting at the ``GetActiveContractsPageResponse``.``active_at_offset`` specified in this request.
     * Clients SHOULD NOT assume that the set of active contracts they receive reflects the state at the ledger end.
     * @param requestBody
     * @returns JsGetActiveContractsPageResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2StateActiveContractsPage(
        requestBody: GetActiveContractsPageRequest,
    ): CancelablePromise<JsGetActiveContractsPageResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/state/active-contracts-page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Get the list of connected synchronizers at the time of the query.
     * @param party
     * @param participantId
     * @param identityProviderId
     * @returns GetConnectedSynchronizersResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2StateConnectedSynchronizers(
        party?: string,
        participantId?: string,
        identityProviderId?: string,
    ): CancelablePromise<GetConnectedSynchronizersResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/state/connected-synchronizers',
            query: {
                'party': party,
                'participantId': participantId,
                'identityProviderId': identityProviderId,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter party, Invalid value for: query parameter participantId, Invalid value for: query parameter identityProviderId`,
            },
        });
    }
    /**
     * Get the current ledger end.
     * Subscriptions started with the returned offset will serve events after this RPC was called.
     * @returns GetLedgerEndResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2StateLedgerEnd(): CancelablePromise<GetLedgerEndResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/state/ledger-end',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Get the latest successfully pruned ledger offsets
     * @returns GetLatestPrunedOffsetsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2StateLatestPrunedOffsets(): CancelablePromise<GetLatestPrunedOffsetsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/state/latest-pruned-offsets',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Read the ledger's filtered update stream for the specified contents and filters.
     * It returns the event types in accordance with the stream contents selected. Also the selection criteria
     * for individual events depends on the transaction shape chosen.
     *
     * - ACS delta: a requesting party must be a stakeholder of an event for it to be included.
     * - ledger effects: a requesting party must be a witness of an event for it to be included.
     * Notice: This endpoint should be used for small results set.
     * When number of results exceeded node configuration limit (`http-list-max-elements-limit`)
     * there will be an error (`413 Content Too Large`) returned.
     * Increasing this limit may lead to performance issues and high memory consumption.
     * Consider using websockets (asyncapi) for better efficiency with larger results.
     * @param requestBody
     * @param limit maximum number of elements to return, this param is ignored if is bigger than server setting
     * @param streamIdleTimeoutMs timeout to complete and send result if no new elements are received (for open ended streams)
     * @returns JsGetUpdatesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2Updates(
        requestBody: GetUpdatesRequest,
        limit?: number,
        streamIdleTimeoutMs?: number,
    ): CancelablePromise<Array<JsGetUpdatesResponse> | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates',
            query: {
                'limit': limit,
                'stream_idle_timeout_ms': streamIdleTimeoutMs,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms`,
            },
        });
    }
    /**
     * @deprecated
     * Query flat transactions update list (blocking call). Provided for backwards compatibility, it will be removed in the Canton version 3.5.0, use v2/updates instead.
     * Notice: This endpoint should be used for small results set.
     * When number of results exceeded node configuration limit (`http-list-max-elements-limit`)
     * there will be an error (`413 Content Too Large`) returned.
     * Increasing this limit may lead to performance issues and high memory consumption.
     * Consider using websockets (asyncapi) for better efficiency with larger results.
     * @param requestBody
     * @param limit maximum number of elements to return, this param is ignored if is bigger than server setting
     * @param streamIdleTimeoutMs timeout to complete and send result if no new elements are received (for open ended streams)
     * @returns JsGetUpdatesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UpdatesFlats(
        requestBody: GetUpdatesRequest,
        limit?: number,
        streamIdleTimeoutMs?: number,
    ): CancelablePromise<Array<JsGetUpdatesResponse> | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates/flats',
            query: {
                'limit': limit,
                'stream_idle_timeout_ms': streamIdleTimeoutMs,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms`,
            },
        });
    }
    /**
     * @deprecated
     * Query update transactions tree list (blocking call). Provided for backwards compatibility, it will be removed in the Canton version 3.5.0, use v2/updates instead.
     * Notice: This endpoint should be used for small results set.
     * When number of results exceeded node configuration limit (`http-list-max-elements-limit`)
     * there will be an error (`413 Content Too Large`) returned.
     * Increasing this limit may lead to performance issues and high memory consumption.
     * Consider using websockets (asyncapi) for better efficiency with larger results.
     * @param requestBody
     * @param limit maximum number of elements to return, this param is ignored if is bigger than server setting
     * @param streamIdleTimeoutMs timeout to complete and send result if no new elements are received (for open ended streams)
     * @returns JsGetUpdateTreesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UpdatesTrees(
        requestBody: GetUpdatesRequest,
        limit?: number,
        streamIdleTimeoutMs?: number,
    ): CancelablePromise<Array<JsGetUpdateTreesResponse> | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates/trees',
            query: {
                'limit': limit,
                'stream_idle_timeout_ms': streamIdleTimeoutMs,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms`,
            },
        });
    }
    /**
     * @deprecated
     * Get transaction tree by offset. Provided for backwards compatibility, it will be removed in the Canton version 3.5.0, use v2/updates/update-by-offset instead.
     * @param offset
     * @param parties
     * @returns JsGetTransactionTreeResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2UpdatesTransactionTreeByOffsetOffset(
        offset: number,
        parties?: Array<string>,
    ): CancelablePromise<JsGetTransactionTreeResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/updates/transaction-tree-by-offset/{offset}',
            path: {
                'offset': offset,
            },
            query: {
                'parties': parties,
            },
            errors: {
                400: `Invalid value, Invalid value for: path parameter offset, Invalid value for: query parameter parties`,
            },
        });
    }
    /**
     * @deprecated
     * Get transaction by offset. Provided for backwards compatibility, it will be removed in the Canton version 3.5.0, use v2/updates/update-by-offset instead.
     * @param requestBody
     * @returns JsGetTransactionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UpdatesTransactionByOffset(
        requestBody: GetTransactionByOffsetRequest,
    ): CancelablePromise<JsGetTransactionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates/transaction-by-offset',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Lookup an update by its offset.
     * If there is no update with this offset, or all the events are filtered, an UPDATE_NOT_FOUND error will be raised.
     * @param requestBody
     * @returns JsGetUpdateResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UpdatesUpdateByOffset(
        requestBody: GetUpdateByOffsetRequest,
    ): CancelablePromise<JsGetUpdateResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates/update-by-offset',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * @deprecated
     * Get transaction by id. Provided for backwards compatibility, it will be removed in the Canton version 3.5.0, use v2/updates/update-by-id instead.
     * @param requestBody
     * @returns JsGetTransactionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UpdatesTransactionById(
        requestBody: GetTransactionByIdRequest,
    ): CancelablePromise<JsGetTransactionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates/transaction-by-id',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Lookup an update by its ID.
     * If there is no update with this ID, or all the events are filtered, an UPDATE_NOT_FOUND error will be raised.
     * @param requestBody
     * @returns JsGetUpdateResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UpdatesUpdateById(
        requestBody: GetUpdateByIdRequest,
    ): CancelablePromise<JsGetUpdateResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates/update-by-id',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * @deprecated
     * Get transaction tree by id. Provided for backwards compatibility, it will be removed in the Canton version 3.5.0, use v2/updates/update-by-id instead.
     * @param updateId
     * @param parties
     * @returns JsGetTransactionTreeResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2UpdatesTransactionTreeByIdUpdateId(
        updateId: string,
        parties?: Array<string>,
    ): CancelablePromise<JsGetTransactionTreeResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/updates/transaction-tree-by-id/{update-id}',
            path: {
                'update-id': updateId,
            },
            query: {
                'parties': parties,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter parties`,
            },
        });
    }
    /**
     * Read a page of ledger's filtered updates. It returns the event types in accordance with
     * the specified contents and filters.
     * Additionally, the selection criteria for individual events depends on the transaction shape chosen.
     *
     * - ACS delta: an event is included only if the requesting party is a stakeholder.
     * - ledger effects: an event is included if the requesting party is a witness.
     * @param requestBody
     * @returns JsGetUpdatesPageResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UpdatesGetUpdatesPage(
        requestBody: GetUpdatesPageRequest,
    ): CancelablePromise<JsGetUpdatesPageResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/updates/get-updates-page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * List all existing users.
     * @param pageSize maximum number of elements in a returned page
     * @param pageToken token - to continue results from a given page, leave empty to start from the beginning of the list, obtain token from the result of previous page
     * @returns ListUsersResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Users(
        pageSize?: number,
        pageToken?: string,
    ): CancelablePromise<ListUsersResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/users',
            query: {
                'pageSize': pageSize,
                'pageToken': pageToken,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter pageSize, Invalid value for: query parameter pageToken`,
            },
        });
    }
    /**
     * Create a new user.
     * @param requestBody
     * @returns CreateUserResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2Users(
        requestBody: CreateUserRequest,
    ): CancelablePromise<CreateUserResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/users',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Get the user data of a specific user or the authenticated user.
     * @param userId
     * @param identityProviderId
     * @returns GetUserResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2UsersUserId(
        userId: string,
        identityProviderId?: string,
    ): CancelablePromise<GetUserResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/users/{user-id}',
            path: {
                'user-id': userId,
            },
            query: {
                'identity-provider-id': identityProviderId,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter identity-provider-id`,
            },
        });
    }
    /**
     * Delete an existing user and all its rights.
     * @param userId
     * @returns any
     * @returns JsCantonError
     * @throws ApiError
     */
    public static deleteV2UsersUserId(
        userId: string,
    ): CancelablePromise<Record<string, any> | JsCantonError> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/v2/users/{user-id}',
            path: {
                'user-id': userId,
            },
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Update selected modifiable attribute of a user resource described by the ``User`` message.
     * @param userId
     * @param requestBody
     * @returns UpdateUserResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static patchV2UsersUserId(
        userId: string,
        requestBody: UpdateUserRequest,
    ): CancelablePromise<UpdateUserResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/v2/users/{user-id}',
            path: {
                'user-id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Get the user data of the current authenticated user.
     * @param identityProviderId
     * @returns GetUserResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2AuthenticatedUser(
        identityProviderId?: string,
    ): CancelablePromise<GetUserResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/authenticated-user',
            query: {
                'identity-provider-id': identityProviderId,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter identity-provider-id`,
            },
        });
    }
    /**
     * List the set of all rights granted to a user.
     * @param userId
     * @returns ListUserRightsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2UsersUserIdRights(
        userId: string,
    ): CancelablePromise<ListUserRightsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/users/{user-id}/rights',
            path: {
                'user-id': userId,
            },
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Grant rights to a user.
     * Granting rights does not affect the resource version of the corresponding user.
     * @param userId
     * @param requestBody
     * @returns GrantUserRightsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2UsersUserIdRights(
        userId: string,
        requestBody: GrantUserRightsRequest,
    ): CancelablePromise<GrantUserRightsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/users/{user-id}/rights',
            path: {
                'user-id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Revoke rights from a user.
     * Revoking rights does not affect the resource version of the corresponding user.
     * @param userId
     * @param requestBody
     * @returns RevokeUserRightsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static patchV2UsersUserIdRights(
        userId: string,
        requestBody: RevokeUserRightsRequest,
    ): CancelablePromise<RevokeUserRightsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/v2/users/{user-id}/rights',
            path: {
                'user-id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Update the assignment of a user from one IDP to another.
     * @param userId
     * @param requestBody
     * @returns UpdateUserIdentityProviderIdResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static patchV2UsersUserIdIdentityProviderId(
        userId: string,
        requestBody: UpdateUserIdentityProviderIdRequest,
    ): CancelablePromise<UpdateUserIdentityProviderIdResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/v2/users/{user-id}/identity-provider-id',
            path: {
                'user-id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * List all existing identity provider configurations.
     * @returns ListIdentityProviderConfigsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Idps(): CancelablePromise<ListIdentityProviderConfigsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/idps',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Create a new identity provider configuration.
     * The request will fail if the maximum allowed number of separate configurations is reached.
     * @param requestBody
     * @returns CreateIdentityProviderConfigResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2Idps(
        requestBody: CreateIdentityProviderConfigRequest,
    ): CancelablePromise<CreateIdentityProviderConfigResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/idps',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Get the identity provider configuration data by id.
     * @param idpId
     * @returns GetIdentityProviderConfigResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2IdpsIdpId(
        idpId: string,
    ): CancelablePromise<GetIdentityProviderConfigResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/idps/{idp-id}',
            path: {
                'idp-id': idpId,
            },
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Delete an existing identity provider configuration.
     * @param idpId
     * @returns DeleteIdentityProviderConfigResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static deleteV2IdpsIdpId(
        idpId: string,
    ): CancelablePromise<DeleteIdentityProviderConfigResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/v2/idps/{idp-id}',
            path: {
                'idp-id': idpId,
            },
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Update selected modifiable attribute of an identity provider config resource described
     * by the ``IdentityProviderConfig`` message.
     * @param idpId
     * @param requestBody
     * @returns UpdateIdentityProviderConfigResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static patchV2IdpsIdpId(
        idpId: string,
        requestBody: UpdateIdentityProviderConfigRequest,
    ): CancelablePromise<UpdateIdentityProviderConfigResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/v2/idps/{idp-id}',
            path: {
                'idp-id': idpId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Requires `readAs` scope for the submitting party when LAPI User authorization is enabled
     * @param requestBody
     * @returns JsPrepareSubmissionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2InteractiveSubmissionPrepare(
        requestBody: JsPrepareSubmissionRequest,
    ): CancelablePromise<JsPrepareSubmissionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/interactive-submission/prepare',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Execute a prepared submission _asynchronously_ on the ledger.
     * Requires `actAs` or `executeAs` scope for the submitting party when LAPI User authorization is enabled
     * Requires a signature of the transaction from the submitting external party.
     * @param requestBody
     * @returns ExecuteSubmissionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2InteractiveSubmissionExecute(
        requestBody: JsExecuteSubmissionRequest,
    ): CancelablePromise<ExecuteSubmissionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/interactive-submission/execute',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Similar to ExecuteSubmission but _synchronously_ wait for the completion of the transaction
     * @param requestBody
     * @returns ExecuteSubmissionAndWaitResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2InteractiveSubmissionExecuteandwait(
        requestBody: JsExecuteSubmissionAndWaitRequest,
    ): CancelablePromise<ExecuteSubmissionAndWaitResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/interactive-submission/executeAndWait',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Similar to ExecuteSubmissionAndWait but additionally returns the transaction
     * @param requestBody
     * @returns JsExecuteSubmissionAndWaitForTransactionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2InteractiveSubmissionExecuteandwaitfortransaction(
        requestBody: JsExecuteSubmissionAndWaitForTransactionRequest,
    ): CancelablePromise<JsExecuteSubmissionAndWaitForTransactionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/interactive-submission/executeAndWaitForTransaction',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * A preferred package is the highest-versioned package for a provided package-name
     * that is vetted by all the participants hosting the provided parties.
     *
     * Ledger API clients should use this endpoint for constructing command submissions
     * that are compatible with the provided preferred package, by making informed decisions on:
     * - which are the compatible packages that can be used to create contracts
     * - which contract or exercise choice argument version can be used in the command
     * - which choices can be executed on a template or interface of a contract
     *
     * Can be accessed by any Ledger API client with a valid token when Ledger API authorization is enabled.
     *
     * Provided for backwards compatibility, it will be removed in the Canton version 3.4.0
     * @param packageName
     * @param parties
     * @param vettingValidAt
     * @param synchronizerId
     * @returns GetPreferredPackageVersionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2InteractiveSubmissionPreferredPackageVersion(
        packageName: string,
        parties?: Array<string>,
        vettingValidAt?: string,
        synchronizerId?: string,
    ): CancelablePromise<GetPreferredPackageVersionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/interactive-submission/preferred-package-version',
            query: {
                'parties': parties,
                'package-name': packageName,
                'vetting_valid_at': vettingValidAt,
                'synchronizer-id': synchronizerId,
            },
            errors: {
                400: `Invalid value, Invalid value for: query parameter parties, Invalid value for: query parameter package-name, Invalid value for: query parameter vetting_valid_at, Invalid value for: query parameter synchronizer-id`,
            },
        });
    }
    /**
     * Compute the preferred packages for the vetting requirements in the request.
     * A preferred package is the highest-versioned package for a provided package-name
     * that is vetted by all the participants hosting the provided parties.
     *
     * Ledger API clients should use this endpoint for constructing command submissions
     * that are compatible with the provided preferred packages, by making informed decisions on:
     * - which are the compatible packages that can be used to create contracts
     * - which contract or exercise choice argument version can be used in the command
     * - which choices can be executed on a template or interface of a contract
     *
     * If the package preferences could not be computed due to no selection satisfying the requirements,
     * a `FAILED_PRECONDITION` error will be returned.
     *
     * Can be accessed by any Ledger API client with a valid token when Ledger API authorization is enabled.
     *
     * Experimental API: this endpoint is not guaranteed to provide backwards compatibility in future releases
     * @param requestBody
     * @returns GetPreferredPackagesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2InteractiveSubmissionPreferredPackages(
        requestBody: GetPreferredPackagesRequest,
    ): CancelablePromise<GetPreferredPackagesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/interactive-submission/preferred-packages',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
    /**
     * Checks if the service is alive
     * @returns any OK: service is alive
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getLivez(): CancelablePromise<any | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/livez',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Checks if the service is ready to serve requests
     * @returns string OK: readiness message
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getReadyz(): CancelablePromise<string | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/readyz',
            errors: {
                400: `Invalid value`,
            },
        });
    }
    /**
     * Looking up contract data by contract ID.
     * This endpoint is experimental / alpha, therefore no backwards compatibility is guaranteed.
     * This endpoint must not be used to look up contracts which entered the participant via party replication
     * or repair service.
     * @param requestBody
     * @returns GetContractResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static postV2ContractsContractById(
        requestBody: GetContractRequest,
    ): CancelablePromise<GetContractResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v2/contracts/contract-by-id',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid value, Invalid value for: body`,
            },
        });
    }
}
