import { keysApi } from "@/lib/keys-api"

export type BulkExportPublicKeysOptions = {
  keyIds: string[]
  getAccessToken: () => Promise<string>
}

export function joinArmoredBlocks(blocks: string[]): string {
  return blocks.join("\n\n")
}

export async function bulkExportPublicKeys(options: BulkExportPublicKeysOptions): Promise<string> {
  const token = await options.getAccessToken()
  const blocks: string[] = []

  for (const keyId of options.keyIds) {
    const armored = await keysApi.exportPublic({ accessToken: token, keyId })
    blocks.push(armored)
  }

  return joinArmoredBlocks(blocks)
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
