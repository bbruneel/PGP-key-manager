import { CreateSubkeyForm } from "@/components/keys/create-subkey-form"
import { ImportSubkeysForm } from "@/components/keys/import-subkeys-form"
import { KeyDetailSubkeys } from "@/components/keys/key-detail-subkeys"
import { KeyDetailTabPanel } from "@/components/keys/key-detail-tab-panel"
import type { CreateSubkeyFieldErrors, CreateSubkeyFormValues } from "@/lib/create-subkey-validation"
import type { PreviewImportSubkeysResponse, PgpKey } from "@/types/api"

export type SubkeysTabProps = {
  isActive: boolean
  keyData: PgpKey
  showMetadataOnlyHint: boolean
  canImportSubkeys: boolean
  canCreateSubkey: boolean
  primaryOpenpgpVersion: 4 | 6
  subkeysRefreshToken: number
  getAccessToken: () => Promise<string>
  importSubkeysApiError: string | null
  importSubkeysRequestId: string | null
  importSubkeysSubmitting: boolean
  importSubkeysPreviewing: boolean
  importSubkeysPreview: PreviewImportSubkeysResponse | null
  onImportSubkeysPreview: () => void
  onImportSubkeysSubmit: () => void
  createSubkeyValues: CreateSubkeyFormValues
  createSubkeyFieldErrors: CreateSubkeyFieldErrors
  createSubkeyApiError: string | null
  createSubkeyRequestId: string | null
  createSubkeySubmitting: boolean
  onCreateSubkeyChange: (nextValues: CreateSubkeyFormValues) => void
  onCreateSubkeyAlgorithmAdjusted: (
    nextValues: CreateSubkeyFormValues,
    previousValues: CreateSubkeyFormValues,
  ) => void
  onCreateSubkeySubmit: () => void
}

export function SubkeysTab({
  isActive,
  keyData,
  showMetadataOnlyHint,
  canImportSubkeys,
  canCreateSubkey,
  primaryOpenpgpVersion,
  subkeysRefreshToken,
  getAccessToken,
  importSubkeysApiError,
  importSubkeysRequestId,
  importSubkeysSubmitting,
  importSubkeysPreviewing,
  importSubkeysPreview,
  onImportSubkeysPreview,
  onImportSubkeysSubmit,
  createSubkeyValues,
  createSubkeyFieldErrors,
  createSubkeyApiError,
  createSubkeyRequestId,
  createSubkeySubmitting,
  onCreateSubkeyChange,
  onCreateSubkeyAlgorithmAdjusted,
  onCreateSubkeySubmit,
}: SubkeysTabProps) {
  return (
    <KeyDetailTabPanel
      panelId="key-detail-subkeys-panel"
      labelledBy="key-detail-subkeys-tab"
      isActive={isActive}
      instrumentationId="keyDetail.tab.subkeys"
    >
      {keyData.role === "primary" && keyData.id ? (
        <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
          <KeyDetailSubkeys
            primaryKeyId={keyData.id}
            getAccessToken={getAccessToken}
            refreshToken={subkeysRefreshToken}
          />
        </div>
      ) : null}

      {showMetadataOnlyHint ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Import or register private key material to add subkeys.
          </p>
        </div>
      ) : null}

      {canImportSubkeys || canCreateSubkey ? (
        <div className="grid gap-6 md:grid-cols-2">
          {canImportSubkeys ? (
            <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
              <ImportSubkeysForm
                apiError={importSubkeysApiError}
                requestId={importSubkeysRequestId}
                submitting={importSubkeysSubmitting}
                previewing={importSubkeysPreviewing}
                preview={importSubkeysPreview}
                disabled={false}
                onPreview={onImportSubkeysPreview}
                onSubmit={onImportSubkeysSubmit}
              />
            </div>
          ) : null}

          {canCreateSubkey ? (
            <div className="rounded-xl border border-border bg-card/40 p-5 shadow-sm">
              <CreateSubkeyForm
                values={createSubkeyValues}
                fieldErrors={createSubkeyFieldErrors}
                apiError={createSubkeyApiError}
                requestId={createSubkeyRequestId}
                submitting={createSubkeySubmitting}
                disabled={false}
                primaryOpenpgpVersion={primaryOpenpgpVersion}
                onChange={onCreateSubkeyChange}
                onAlgorithmAdjusted={onCreateSubkeyAlgorithmAdjusted}
                onSubmit={onCreateSubkeySubmit}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </KeyDetailTabPanel>
  )
}
