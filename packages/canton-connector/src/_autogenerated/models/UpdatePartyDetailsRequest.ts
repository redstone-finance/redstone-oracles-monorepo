/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FieldMask } from './FieldMask';
import type { PartyDetails } from './PartyDetails';
/**
 * Required authorization: ``HasRight(ParticipantAdmin) OR IsAuthenticatedIdentityProviderAdmin(party_details.identity_provider_id)``
 */
export type UpdatePartyDetailsRequest = {
    /**
     * Party to be updated
     * Required,
     * Modifiable
     */
    partyDetails?: PartyDetails;
    /**
     * An update mask specifies how and which properties of the ``PartyDetails`` message are to be updated.
     * An update mask consists of a set of update paths.
     * A valid update path points to a field or a subfield relative to the ``PartyDetails`` message.
     * A valid update mask must:
     *
     * 1. contain at least one update path,
     * 2. contain only valid update paths.
     *
     * Fields that can be updated are marked as ``Modifiable``.
     * An update path can also point to non-``Modifiable`` fields such as 'party' and 'local_metadata.resource_version'
     * because they are used:
     *
     * 1. to identify the party details resource subject to the update,
     * 2. for concurrent change control.
     *
     * An update path can also point to non-``Modifiable`` fields such as 'is_local'
     * as long as the values provided in the update request match the server values.
     * Examples of update paths: 'local_metadata.annotations', 'local_metadata'.
     * For additional information see the documentation for standard protobuf3's ``google.protobuf.FieldMask``.
     * For similar Ledger API see ``com.daml.ledger.api.v2.admin.UpdateUserRequest``.
     * Required
     */
    updateMask?: FieldMask;
};

