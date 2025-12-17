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
import type { GetActiveContractsRequest } from '../models/GetActiveContractsRequest';
import type { GetConnectedSynchronizersResponse } from '../models/GetConnectedSynchronizersResponse';
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
import type { JsGetActiveContractsResponse } from '../models/JsGetActiveContractsResponse';
import type { JsGetEventsByContractIdResponse } from '../models/JsGetEventsByContractIdResponse';
import type { JsGetTransactionResponse } from '../models/JsGetTransactionResponse';
import type { JsGetTransactionTreeResponse } from '../models/JsGetTransactionTreeResponse';
import type { JsGetUpdateResponse } from '../models/JsGetUpdateResponse';
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
     * Submit a batch of commands and wait for the completion details
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Submit a batch of commands and wait for the transaction response
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Submit a batch of reassignment commands and wait for the reassignment response
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
                400: `Invalid value for: body, Invalid value for: headers`,
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Submit a command asynchronously
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Submit reassignment command asynchronously
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Query completions list (blocking call)
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
                400: `Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get events by contract Id
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get the version details of the participant node
     * @returns GetLedgerApiVersionResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Version(): CancelablePromise<GetLedgerApiVersionResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/version',
            errors: {
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Validates a DAR for upgrade-compatibility against the current vetting state on the target synchronizer
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
                400: `Invalid value for: body, Invalid value for: query parameter synchronizerId, Invalid value for: headers`,
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
                400: `Invalid value for: body, Invalid value for: query parameter vetAllPackages, Invalid value for: query parameter synchronizerId, Invalid value for: headers`,
            },
        });
    }
    /**
     * List all packages uploaded on the participant node
     * @returns ListPackagesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Packages(): CancelablePromise<ListPackagesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/packages',
            errors: {
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Upload a DAR to the participant node. Behaves the same as /dars. This endpoint will be deprecated and removed in a future release.
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
                400: `Invalid value for: body, Invalid value for: query parameter vetAllPackages, Invalid value for: query parameter synchronizerId, Invalid value for: headers`,
            },
        });
    }
    /**
     * Download the package for the requested package-id
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
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Get package status
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
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * List vetted packages
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Update vetted packages
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * List all known parties.
     * @param pageSize maximum number of elements in a returned page
     * @param pageToken token - to continue results from a given page, leave empty to start from the beginning of the list, obtain token from the result of previous page
     * @returns ListKnownPartiesResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Parties(
        pageSize?: number,
        pageToken?: string,
    ): CancelablePromise<ListKnownPartiesResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/parties',
            query: {
                'pageSize': pageSize,
                'pageToken': pageToken,
            },
            errors: {
                400: `Invalid value for: query parameter pageSize, Invalid value for: query parameter pageToken, Invalid value for: headers`,
            },
        });
    }
    /**
     * Allocate a new party to the participant node
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Allocate a new external party
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get participant id
     * @returns GetParticipantIdResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2PartiesParticipantId(): CancelablePromise<GetParticipantIdResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/parties/participant-id',
            errors: {
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Get party details
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
                400: `Invalid value for: query parameter identity-provider-id, Invalid value for: query parameter parties, Invalid value for: headers`,
            },
        });
    }
    /**
     * Allocate a new party to the participant node
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Generate a topology for an external party
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
                400: `Invalid value for: body, Invalid value for: headers`,
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
                400: `Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get connected synchronizers
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
                400: `Invalid value for: query parameter party, Invalid value for: query parameter participantId, Invalid value for: query parameter identityProviderId, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get ledger end
     * @returns GetLedgerEndResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2StateLedgerEnd(): CancelablePromise<GetLedgerEndResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/state/ledger-end',
            errors: {
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Get latest pruned offsets
     * @returns GetLatestPrunedOffsetsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2StateLatestPrunedOffsets(): CancelablePromise<GetLatestPrunedOffsetsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/state/latest-pruned-offsets',
            errors: {
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Query updates list (blocking call)
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
                400: `Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms, Invalid value for: headers`,
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
                400: `Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms, Invalid value for: headers`,
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
                400: `Invalid value for: body, Invalid value for: query parameter limit, Invalid value for: query parameter stream_idle_timeout_ms, Invalid value for: headers`,
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
                400: `Invalid value for: path parameter offset, Invalid value for: query parameter parties, Invalid value for: headers`,
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get update by offset
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
                400: `Invalid value for: body, Invalid value for: headers`,
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get update by id
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
                400: `Invalid value for: body, Invalid value for: headers`,
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
                400: `Invalid value for: query parameter parties, Invalid value for: headers`,
            },
        });
    }
    /**
     * List all users.
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
                400: `Invalid value for: query parameter pageSize, Invalid value for: query parameter pageToken, Invalid value for: headers`,
            },
        });
    }
    /**
     * Create user.
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get user details.
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
                400: `Invalid value for: query parameter identity-provider-id, Invalid value for: headers`,
            },
        });
    }
    /**
     * Delete user.
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
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Update  user.
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get current user details (uses user for JWT).
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
                400: `Invalid value for: query parameter identity-provider-id, Invalid value for: headers`,
            },
        });
    }
    /**
     * List user rights.
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
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Grant user rights.
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Revoke user rights.
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Update user identity provider.
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * List all identity provider configs
     * @returns ListIdentityProviderConfigsResponse
     * @returns JsCantonError
     * @throws ApiError
     */
    public static getV2Idps(): CancelablePromise<ListIdentityProviderConfigsResponse | JsCantonError> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v2/idps',
            errors: {
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Create identity provider configs
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get identity provider config
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
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Delete identity provider config
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
                400: `Invalid value for: headers`,
            },
        });
    }
    /**
     * Update identity provider config
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Prepare commands for signing
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Execute a signed transaction
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Execute a signed transaction and wait for its completion
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Execute a signed transaction and wait for the transaction response
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get the preferred package version for constructing a command submission
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
                400: `Invalid value for: query parameter parties, Invalid value for: query parameter package-name, Invalid value for: query parameter vetting_valid_at, Invalid value for: query parameter synchronizer-id, Invalid value for: headers`,
            },
        });
    }
    /**
     * Get the version of preferred packages for constructing a command submission
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
                400: `Invalid value for: body, Invalid value for: headers`,
            },
        });
    }
}
