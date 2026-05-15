import { auth0Configured } from "@/lib/auth0-env"
import { HomeAuthPanel } from "@/pages/HomeAuthPanel"
import { HomePage } from "@/pages/HomePage"

export function App() {
  return (
    <>
      <HomePage />
      {auth0Configured() ? (
        <HomeAuthPanel />
      ) : (
        <section className="mx-auto max-w-lg rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground px-6">
          <p>
            Set <code className="rounded bg-muted px-1 text-foreground">VITE_AUTH0_DOMAIN</code> and{" "}
            <code className="rounded bg-muted px-1 text-foreground">VITE_AUTH0_CLIENT_ID</code> in{" "}
            <code className="rounded bg-muted px-1 text-foreground">.env.local</code> to enable Auth0.
          </p>
        </section>
      )}
    </>
  )
}
