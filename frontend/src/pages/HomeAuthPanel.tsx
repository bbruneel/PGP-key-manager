import { useAuth0 } from "@auth0/auth0-react"

import { Button } from "@/components/ui/button"

export function HomeAuthPanel() {
  const auth0 = useAuth0()

  if (auth0.isAuthenticated) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <header className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Authentication</h2>
          <p className="mt-1 text-sm text-muted-foreground">Auth0 single-page application session.</p>
        </header>
        <p className="text-sm text-foreground">
          Signed in as <span className="font-medium">{auth0.user?.email ?? auth0.user?.sub}</span>
        </p>
        <Button
          type="button"
          className="mt-6 transition-colors duration-200"
          variant="outline"
          onClick={() => void auth0.logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Log out
        </Button>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to sync keys and policies with your account.</p>
      </header>
      <Button type="button" className="transition-colors duration-200" onClick={() => void auth0.loginWithRedirect()}>
        Log in
      </Button>
    </section>
  )
}

export function HomeAuthPlaceholder() {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm md:p-8">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Authentication</h2>
      <p className="mt-2 text-muted-foreground">
        Set <code className="rounded bg-muted px-1 text-foreground">VITE_AUTH0_DOMAIN</code> and{" "}
        <code className="rounded bg-muted px-1 text-foreground">VITE_AUTH0_CLIENT_ID</code> in{" "}
        <code className="rounded bg-muted px-1 text-foreground">.env.local</code> to enable Auth0.
      </p>
    </section>
  )
}
