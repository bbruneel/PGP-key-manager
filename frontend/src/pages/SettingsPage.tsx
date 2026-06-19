import { StorageConnectionsSection } from "@/components/settings/storage-connections-section"

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage BYO cloud storage connections and prepare external keyring storage.
        </p>
      </section>
      <StorageConnectionsSection />
    </div>
  )
}
