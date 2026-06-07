import { KeyRound } from "lucide-react"

export function AuthLoadingScreen({ message = "Checking sign-in…" }: { message?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <KeyRound className="size-6" strokeWidth={1.75} aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">PGP Key Manager</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
