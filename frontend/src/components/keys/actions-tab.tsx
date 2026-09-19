import { DeleteKeyForm } from "@/components/keys/delete-key-form"
import { ExtendExpiryForm } from "@/components/keys/extend-expiry-form"
import { KeyDetailTabPanel } from "@/components/keys/key-detail-tab-panel"
import { RevokeKeyForm } from "@/components/keys/revoke-key-form"
import { RotateKeyForm } from "@/components/keys/rotate-key-form"
import { TransferOwnershipForm } from "@/components/keys/transfer-ownership-form"
import type { ExtendExpiryFieldErrors, ExtendExpiryFormValues } from "@/lib/extend-key-validation"
import type { RevokeKeyFieldErrors, RevokeKeyFormValues } from "@/lib/revoke-key-validation"
import type { RotateKeyFieldErrors, RotateKeyFormValues } from "@/lib/rotate-key-validation"
import type {
  TransferOwnershipFieldErrors,
  TransferOwnershipFormValues,
} from "@/lib/transfer-ownership-validation"
import type { Group, GroupMember, PgpKey } from "@/types/api"

export type ActionsTabProps = {
  isActive: boolean
  keyData: PgpKey
  isSubkey: boolean
  isRevoked: boolean
  requiresPassphrase: boolean
  canExtend: boolean
  canRotate: boolean
  primaryOpenpgpVersion: 4 | 6
  revokeValues: RevokeKeyFormValues
  revokeFieldErrors: RevokeKeyFieldErrors
  revokeApiError: string | null
  revokeRequestId: string | null
  revokeSubmitting: boolean
  onRevokeChange: (nextValues: RevokeKeyFormValues) => void
  onRevokeSubmit: () => void
  extendValues: ExtendExpiryFormValues
  extendFieldErrors: ExtendExpiryFieldErrors
  extendApiError: string | null
  extendRequestId: string | null
  extendSubmitting: boolean
  onExtendChange: (nextValues: ExtendExpiryFormValues) => void
  onExtendSubmit: () => void
  rotateValues: RotateKeyFormValues
  rotateFieldErrors: RotateKeyFieldErrors
  rotateApiError: string | null
  rotateRequestId: string | null
  rotateSubmitting: boolean
  onRotateChange: (nextValues: RotateKeyFormValues) => void
  onRotateAlgorithmAdjusted: (
    nextValues: RotateKeyFormValues,
    previousValues: RotateKeyFormValues,
  ) => void
  onRotateSubmit: () => void
  transferValues: TransferOwnershipFormValues
  transferFieldErrors: TransferOwnershipFieldErrors
  transferApiError: string | null
  transferRequestId: string | null
  transferSubmitting: boolean
  transferDisabled: boolean
  transferDisabledReason: string | null
  transferCurrentOwnerLabel: string
  transferAvailableGroups: Group[]
  transferMembers: GroupMember[]
  transferMembersLoading: boolean
  transferSubkeyCount: number
  transferAllowPersonalDestination: boolean
  onTransferChange: (nextValues: TransferOwnershipFormValues) => void
  onTransferConfirm: () => void
  deleteApiError: string | null
  deleteRequestId: string | null
  deleteSubmitting: boolean
  onDeleteSubmit: () => void
}

export function ActionsTab({
  isActive,
  keyData,
  isSubkey,
  isRevoked,
  requiresPassphrase,
  canExtend,
  canRotate,
  primaryOpenpgpVersion,
  revokeValues,
  revokeFieldErrors,
  revokeApiError,
  revokeRequestId,
  revokeSubmitting,
  onRevokeChange,
  onRevokeSubmit,
  extendValues,
  extendFieldErrors,
  extendApiError,
  extendRequestId,
  extendSubmitting,
  onExtendChange,
  onExtendSubmit,
  rotateValues,
  rotateFieldErrors,
  rotateApiError,
  rotateRequestId,
  rotateSubmitting,
  onRotateChange,
  onRotateAlgorithmAdjusted,
  onRotateSubmit,
  transferValues,
  transferFieldErrors,
  transferApiError,
  transferRequestId,
  transferSubmitting,
  transferDisabled,
  transferDisabledReason,
  transferCurrentOwnerLabel,
  transferAvailableGroups,
  transferMembers,
  transferMembersLoading,
  transferSubkeyCount,
  transferAllowPersonalDestination,
  onTransferChange,
  onTransferConfirm,
  deleteApiError,
  deleteRequestId,
  deleteSubmitting,
  onDeleteSubmit,
}: ActionsTabProps) {
  return (
    <KeyDetailTabPanel
      panelId="key-detail-actions-panel"
      labelledBy="key-detail-actions-tab"
      isActive={isActive}
      instrumentationId="keyDetail.tab.actions"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
          <RevokeKeyForm
            values={revokeValues}
            fieldErrors={revokeFieldErrors}
            apiError={revokeApiError}
            requestId={revokeRequestId}
            submitting={revokeSubmitting}
            disabled={isRevoked}
            requiresPassphrase={requiresPassphrase}
            onChange={onRevokeChange}
            onSubmit={onRevokeSubmit}
          />
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
          <ExtendExpiryForm
            values={extendValues}
            fieldErrors={extendFieldErrors}
            apiError={extendApiError}
            requestId={extendRequestId}
            submitting={extendSubmitting}
            disabled={!canExtend}
            requiresPassphrase={canExtend}
            onChange={onExtendChange}
            onSubmit={onExtendSubmit}
          />
        </div>
      </div>

      {isSubkey ? (
        <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
          <RotateKeyForm
            values={rotateValues}
            fieldErrors={rotateFieldErrors}
            apiError={rotateApiError}
            requestId={rotateRequestId}
            submitting={rotateSubmitting}
            disabled={!canRotate}
            primaryOpenpgpVersion={primaryOpenpgpVersion}
            onChange={onRotateChange}
            onAlgorithmAdjusted={onRotateAlgorithmAdjusted}
            onSubmit={onRotateSubmit}
          />
        </div>
      ) : null}

      {!isSubkey ? (
        <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
          <TransferOwnershipForm
            values={transferValues}
            fieldErrors={transferFieldErrors}
            apiError={transferApiError}
            requestId={transferRequestId}
            submitting={transferSubmitting}
            disabled={transferDisabled}
            disabledReason={transferDisabledReason}
            currentOwnerLabel={transferCurrentOwnerLabel}
            availableGroups={transferAvailableGroups}
            members={transferMembers}
            membersLoading={transferMembersLoading}
            subkeyCount={transferSubkeyCount}
            allowPersonalDestination={transferAllowPersonalDestination}
            onChange={onTransferChange}
            onConfirm={onTransferConfirm}
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Deleting a key is permanent and removes it from the vault database. It does not perform
          cryptographic revocation.
        </p>
        <DeleteKeyForm
          role={keyData.role ?? "primary"}
          fingerprint={keyData.fingerprint}
          apiError={deleteApiError}
          requestId={deleteRequestId}
          submitting={deleteSubmitting}
          disabled={false}
          onSubmit={onDeleteSubmit}
        />
      </div>
    </KeyDetailTabPanel>
  )
}
