import { Link } from "react-router-dom"

import { auth0Configured } from "@/lib/auth0-env"
import { HomeAuthPanel, HomeAuthPlaceholder } from "@/pages/HomeAuthPanel"
import { HomePage, type ApiHealth } from "@/pages/HomePage"

type OverviewPageProps = {
  onHealthChange?: (health: ApiHealth) => void
}

export function OverviewPage({ onHealthChange }: OverviewPageProps) {
  return (
    <>
      <HomePage onHealthChange={onHealthChange} />
      {auth0Configured() ? <HomeAuthPanel /> : <HomeAuthPlaceholder />}
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">PGP keys</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          View and manage keys on the{" "}
          <Link to="/keys" className="font-medium text-primary underline-offset-4 hover:underline">
            Keys page
          </Link>
          .
        </p>
      </section>
    </>
  )
}
