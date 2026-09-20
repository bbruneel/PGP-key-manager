import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { KeyDetailSummary } from "@/components/keys/key-detail-summary"
import type { PgpKey } from "@/types/api"

const sampleKey: PgpKey = {
  id: "key-1",
  label: "Work key",
  fingerprint: "ABCD1234EF567890",
  keyId: "EF567890",
  keyType: "private",
  role: "primary",
  ownerType: "user",
  capabilities: ["certify", "sign"],
  algorithm: "ed25519",
  status: "active",
  expiresAt: "2030-06-01T00:00:00Z",
  encryptedPrivateArmored: "-----BEGIN PGP PRIVATE KEY BLOCK-----",
  openpgpVersion: 4,
}

describe("KeyDetailSummary", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders key metadata and private material hint", () => {
    render(<KeyDetailSummary keyData={sampleKey} />)

    expect(screen.getByRole("heading", { name: "Work key" })).toBeInTheDocument()
    expect(screen.getByText("ABCD1234EF567890")).toBeInTheDocument()
    expect(screen.getByText("EF567890")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText(/certify, sign/)).toBeInTheDocument()
    expect(screen.getByText(/stored private material/i)).toBeInTheDocument()
    expect(screen.getByText("Personal vault")).toBeInTheDocument()
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

  it("shows group ownership badge when key is group-owned", () => {
    render(
      <KeyDetailSummary
        keyData={{
          ...sampleKey,
          ownerType: "group",
          ownerGroupId: "2cfb1f20-10c9-4de0-b8dc-d89bbf3ab5d9",
        }}
        ownerGroupName="Platform security"
      />,
    )

    expect(screen.getByText("Owned by Platform security")).toBeInTheDocument()
  })

  it("shows Primary key is revoked hint on subkey when primaryRevoked", () => {
    render(
      <KeyDetailSummary
        keyData={{
          ...sampleKey,
          role: "subkey",
          status: "revoked",
          parentKeyId: "primary-1",
        }}
        primaryRevoked
      />,
    )

    expect(screen.getByText("Revoked")).toBeInTheDocument()
    expect(screen.getByText("Primary key is revoked")).toBeInTheDocument()
    expect(screen.getByText("Primary key is revoked")).toHaveAttribute(
      "data-pgp-ui",
      "keyDetail.status.primaryRevoked",
    )
  })

  it("does not show primary-revoked hint on primary keys", () => {
    render(<KeyDetailSummary keyData={{ ...sampleKey, status: "revoked" }} primaryRevoked />)

    expect(screen.queryByText("Primary key is revoked")).not.toBeInTheDocument()
  })

  it("does not show primary-revoked hint when primary is active", () => {
    render(
      <KeyDetailSummary
        keyData={{
          ...sampleKey,
          role: "subkey",
          status: "revoked",
          parentKeyId: "primary-1",
        }}
        primaryRevoked={false}
      />,
    )

    expect(screen.queryByText("Primary key is revoked")).not.toBeInTheDocument()
  })
})
