import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { KeyDetailSummary } from "@/components/keys/key-detail-summary"
import type { PgpKey } from "@/types/api"

const sampleKey: PgpKey = {
  id: "key-1",
  label: "Work key",
  fingerprint: "ABCD1234EF567890",
  keyId: "EF567890",
  keyType: "private",
  role: "primary",
  capabilities: ["certify", "sign"],
  algorithm: "ed25519",
  status: "active",
  expiresAt: "2030-06-01T00:00:00Z",
  encryptedPrivateArmored: "-----BEGIN PGP PRIVATE KEY BLOCK-----",
  openpgpVersion: 4,
}

describe("KeyDetailSummary", () => {
  it("renders key metadata and private material hint", () => {
    render(<KeyDetailSummary keyData={sampleKey} />)

    expect(screen.getByRole("heading", { name: "Work key" })).toBeInTheDocument()
    expect(screen.getByText("ABCD1234EF567890")).toBeInTheDocument()
    expect(screen.getByText("EF567890")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText(/certify, sign/)).toBeInTheDocument()
    expect(screen.getByText(/stored private material/i)).toBeInTheDocument()
  })

  it("shows public-only hint when no private material", () => {
    render(
      <KeyDetailSummary
        keyData={{
          ...sampleKey,
          keyType: "public",
          encryptedPrivateArmored: undefined,
        }}
      />,
    )

    expect(screen.getByText(/public-only key/i)).toBeInTheDocument()
  })
})
