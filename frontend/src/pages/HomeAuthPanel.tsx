import { useAuth0 } from "@auth0/auth0-react"

import { Button } from "@/components/ui/button"

export function HomeAuthPanel() {
  const auth0 = useAuth0()

  if (auth0.isAuthenticated) {
    return (
      <section className="mx-auto max-w-lg rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm px-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Auth0 (SPA)</h2>
        <p className="text-sm">Signed in as {auth0.user?.email ?? auth0.user?.sub}</p>
        <Button
          type="button"
          className="mt-3"
          variant="outline"
          size="sm"
          onClick={() => void auth0.logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Log out
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-lg rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm px-6">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Auth0 (SPA)</h2>
      <Button type="button" size="sm" onClick={() => void auth0.loginWithRedirect()}>
        Log in
      </Button>
    </section>
  )
}
