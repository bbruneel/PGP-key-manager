import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { useGroupContext } from "@/hooks/use-group-context"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { groupsApi } from "@/lib/groups-api"

const NAME_MAX_LENGTH = 255
const DESCRIPTION_MAX_LENGTH = 1024

export function CreateGroupPage() {
  const navigate = useNavigate()
  const { getAccessToken, isAuthenticated, isConfigured, authError } = useApiAccessToken()
  const { setActiveGroupId, refreshGroups } = useGroupContext()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError("Name is required")
      return
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setNameError(`Name must be at most ${NAME_MAX_LENGTH} characters`)
      return
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      setApiError(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
      return
    }

    setNameError(null)
    setApiError(null)
    setRequestId(null)
    setSubmitting(true)

    try {
      const accessToken = await getAccessToken()
      const created = await groupsApi.create({
        accessToken,
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
        },
      })
      setActiveGroupId(created.id)
      await refreshGroups()
      toast.success("Group created", { description: created.name })
      navigate(`/groups/${created.id}/keys`)
    } catch (error) {
      setApiError(getApiErrorMessage(error))
      if (error instanceof ApiError && error.requestId) {
        setRequestId(error.requestId)
      }
    } finally {
      setSubmitting(false)
    }
  }, [description, getAccessToken, name, navigate, refreshGroups, setActiveGroupId])

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Create group</h2>
        <p className="mt-2 text-muted-foreground">Configure Auth0 to manage team vault groups via the API.</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Create group</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to create a team vault group.</p>
        {authError ? <p className="mt-2 text-sm text-destructive">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Create group</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a shared team vault and start assigning keys to your group.
        </p>
      </header>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="create-group-name">Group name</Label>
          <Input
            id="create-group-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setNameError(null)
            }}
            disabled={submitting}
            maxLength={NAME_MAX_LENGTH}
            placeholder="Platform security"
          />
          {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-group-description">Description (optional)</Label>
          <Textarea
            id="create-group-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={submitting}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="Owners can invite members and assign keys to this vault."
            className="min-h-24"
          />
        </div>

        {apiError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <p>{apiError}</p>
            {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating group…" : "Create group"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/keys")} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  )
}
