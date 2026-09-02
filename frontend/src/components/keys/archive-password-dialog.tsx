import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { copyTextToClipboard } from "@/lib/clipboard"

type ArchivePasswordDialogProps = {
  open: boolean
  password: string | null
  onCopy: () => void
  onDismiss: () => void
}

export function ArchivePasswordDialog({
  open,
  password,
  onCopy,
  onDismiss,
}: ArchivePasswordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (open && password) {
      if (!dialog.open) {
        if (typeof dialog.showModal === "function") {
          dialog.showModal()
        } else {
          dialog.setAttribute("open", "")
        }
      }
    } else if (dialog.open || dialog.hasAttribute("open")) {
      if (typeof dialog.close === "function") {
        dialog.close()
      } else {
        dialog.removeAttribute("open")
      }
    }
  }, [open, password])

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault()
      }}
      aria-labelledby="archive-password-title"
    >
      <div className="space-y-4">
        <div>
          <h2 id="archive-password-title" className="text-base font-semibold">
            Save your zip password
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This password is shown once. It is not stored in the zip or in the vault. If you lose it,
            download a new pack (a new password is generated).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="archive-password-value">Archive password</Label>
          <Input
            id="archive-password-value"
            readOnly
            value={password ?? ""}
            className="font-mono"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!password) {
                return
              }
              void copyTextToClipboard(password).then(() => onCopy())
            }}
          >
            Copy password
          </Button>
          <Button type="button" onClick={onDismiss}>
            I saved this password
          </Button>
        </div>
      </div>
    </dialog>
  )
}
