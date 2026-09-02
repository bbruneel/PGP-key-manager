import { Link } from "react-router-dom"

import { EditKeyLabelForm } from "@/components/keys/edit-key-label-form"
import { KeyDetailSummary } from "@/components/keys/key-detail-summary"
import { KeyDetailTabPanel } from "@/components/keys/key-detail-tab-panel"
import { KeyExportAction } from "@/components/keys/key-export-action"
import { SshSetupCard } from "@/components/keys/ssh-setup-card"
import type { UpdateKeyLabelFieldErrors, UpdateKeyLabelFormValues } from "@/lib/update-key-label-validation"
import type { PgpKey } from "@/types/api"

export type OverviewTabProps = {
  isActive: boolean
  keyData: PgpKey
  ownerGroupName?: string | null
  isSubkey: boolean
  showSshExport: boolean
  showSshPrivateExport: boolean
  sshPackDisabledReason?: string | null
  subkeysRefreshToken: number
  getAccessToken: () => Promise<string>
  updateLabelValues: UpdateKeyLabelFormValues
  updateLabelFieldErrors: UpdateKeyLabelFieldErrors
  updateLabelApiError: string | null
  updateLabelRequestId: string | null
  updateLabelSubmitting: boolean
  onUpdateLabelChange: (nextValues: UpdateKeyLabelFormValues) => void
  onUpdateLabelSubmit: () => void
}

export function OverviewTab({
  isActive,
  keyData,
  ownerGroupName,
  isSubkey,
  showSshExport,
  showSshPrivateExport,
  sshPackDisabledReason,
  subkeysRefreshToken,
  getAccessToken,
  updateLabelValues,
  updateLabelFieldErrors,
  updateLabelApiError,
  updateLabelRequestId,
  updateLabelSubmitting,
  onUpdateLabelChange,
  onUpdateLabelSubmit,
}: OverviewTabProps) {
  return (
    <KeyDetailTabPanel
      panelId="key-detail-overview-panel"
      labelledBy="key-detail-overview-tab"
      isActive={isActive}
      instrumentationId="keyDetail.tab.overview"
    >
      {isSubkey && keyData.parentKeyId ? (
        <p className="text-sm text-muted-foreground">
          Subkey of{" "}
          <Link
            to={`/keys/${keyData.parentKeyId}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            primary key
          </Link>
        </p>
      ) : null}

      <KeyDetailSummary keyData={keyData} ownerGroupName={ownerGroupName} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
          <EditKeyLabelForm
            values={updateLabelValues}
            fieldErrors={updateLabelFieldErrors}
            apiError={updateLabelApiError}
            requestId={updateLabelRequestId}
            submitting={updateLabelSubmitting}
            disabled={false}
            onChange={onUpdateLabelChange}
            onSubmit={onUpdateLabelSubmit}
          />
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm flex flex-col justify-between gap-5">
          <KeyExportAction
            keyId={keyData.id!}
            fingerprint={keyData.fingerprint}
            getAccessToken={getAccessToken}
            invalidateToken={subkeysRefreshToken}
          />
          {showSshExport ? (
            <div className="border-t border-border pt-5">
              <SshSetupCard
                keyId={keyData.id!}
                fingerprint={keyData.fingerprint}
                keyIdHex={keyData.keyId}
                label={keyData.label}
                canDownloadPack={showSshPrivateExport}
                packDisabledReason={sshPackDisabledReason}
                getAccessToken={getAccessToken}
                invalidateToken={subkeysRefreshToken}
              />
            </div>
          ) : null}
        </div>
      </div>
    </KeyDetailTabPanel>
  )
}
