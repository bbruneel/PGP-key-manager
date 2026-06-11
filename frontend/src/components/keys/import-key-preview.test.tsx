import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ImportKeyPreview } from "@/components/keys/import-key-preview"
import type { PreviewKeyEntry } from "@/types/api"

const primary: PreviewKeyEntry = {
  role: "primary",
  fingerprint: "A1B2C3D4E5F6789012345678ABCDEF0123456789",
  keyId: "ABCDEF0123456789",
  algorithm: "ed25519",
  capabilities: ["certify", "sign"],
  expiresAt: null,
  status: "active",
  openpgpVersion: 4,
}

const revokedSubkey: PreviewKeyEntry = {
  role: "subkey",
  fingerprint: "B2C3D4E5F6789012345678ABCDEF0123456789AB",
  keyId: "BCDEF0123456789A",
  algorithm: "cv25519",
  capabilities: ["encrypt"],
  expiresAt: "2029-06-01T00:00:00Z",
  status: "revoked",
  revokedAt: "2026-06-01T00:00:00Z",
  revocationReason: "key_retired",
  openpgpVersion: 4,
}

describe("ImportKeyPreview", () => {
  it("renders primary and subkey rows with status badges", () => {
    render(
      <ImportKeyPreview
        primary={primary}
        subkeys={[revokedSubkey]}
        warnings={["Private keyring has 1 subkey not present in the pasted public block."]}
        source="both"
      />,
    )

    expect(screen.getByRole("region", { name: "Import preview" })).toBeInTheDocument()
    expect(screen.getByText("primary")).toBeInTheDocument()
    expect(screen.getByText("subkey")).toBeInTheDocument()
    expect(screen.getByText("Revoked")).toBeInTheDocument()
    expect(screen.getByText(/1 subkey will be registered/)).toBeInTheDocument()
    expect(screen.getByText(/Private keyring has 1 subkey/)).toBeInTheDocument()
  })
})
