import { getApiErrorMessage } from "@/lib/api-error"
import { keysApi } from "@/lib/keys-api"

export type BulkExportPublicKeysOptions = {
  keyIds: string[]
  getAccessToken: () => Promise<string>
}

export type BulkExportFailure = {
  keyId: string
  message: string
}

export type BulkExportResult = {
  armored: string
  succeeded: string[]
  failed: BulkExportFailure[]
}

export function joinArmoredBlocks(blocks: string[]): string {
  return blocks.join("\n\n")
}

export async function bulkExportPublicKeys(
  options: BulkExportPublicKeysOptions,
): Promise<BulkExportResult> {
  const token = await options.getAccessToken()
  const blocks: string[] = []
  const succeeded: string[] = []
  const failed: BulkExportFailure[] = []

  for (const keyId of options.keyIds) {
    try {
      const armored = await keysApi.exportPublic({ accessToken: token, keyId })
      blocks.push(armored)
      succeeded.push(keyId)
    } catch (error) {
      failed.push({ keyId, message: getApiErrorMessage(error) })
    }
  }

  return {
    armored: joinArmoredBlocks(blocks),
    succeeded,
    failed,
  }
}

export function downloadArmoredBundle(filename: string, armored: string): void {
  const blob = new Blob([armored], { type: "application/pgp-keys" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function bulkExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `keys-export-${date}.asc`
}
