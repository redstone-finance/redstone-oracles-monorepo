/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FieldMask } from './FieldMask';
import type { User } from './User';
/**
 * Required authorization: ``HasRight(ParticipantAdmin) OR IsAuthenticatedIdentityProviderAdmin(user.identity_provider_id)``
 */
export type UpdateUserRequest = {
    /**
     * The user to update.
     * Required,
     * Modifiable
     */
    user?: User;
    /**
     * An update mask specifies how and which properties of the ``User`` message are to be updated.
     * An update mask consists of a set of update paths.
     * A valid update path points to a field or a subfield relative to the ``User`` message.
     * A valid update mask must:
     *
     * 1. contain at least one update path,
     * 2. contain only valid update paths.
     *
     * Fields that can be updated are marked as ``Modifiable``.
     * An update path can also point to a non-``Modifiable`` fields such as 'id' and 'metadata.resource_version'
     * because they are used:
     *
     * 1. to identify the user resource subject to the update,
     * 2. for concurrent change control.
     *
     * Examples of valid update paths: 'primary_party', 'metadata', 'metadata.annotations'.
     * For additional information see the documentation for standard protobuf3's ``google.protobuf.FieldMask``.
     * For similar Ledger API see ``com.daml.ledger.api.v2.admin.UpdatePartyDetailsRequest``.
     * Required
     */
    updateMask?: FieldMask;
};

