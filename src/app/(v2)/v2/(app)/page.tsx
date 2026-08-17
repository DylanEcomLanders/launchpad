import { requireV2User } from "@/lib/v2/auth";
import { listClients } from "@/lib/v2/clients";
import { CreateClientForm } from "./create-client-form";
import { SignOutButton } from "./sign-out-button";

export default async function V2HomePage() {
  const user = await requireV2User();
  const clients = await listClients();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-subtle">
            Launchpad 2.0
          </p>
          <h1 className="mt-2 text-xl font-medium text-foreground">Foundation</h1>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-8 rounded border border-border bg-surface px-4 py-4">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-subtle">
          Signed in as
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">{user.name}</p>
        <p className="mt-0.5 text-sm text-muted">{user.email}</p>
        <p className="mt-2 text-xs text-subtle">
          {user.role} · {user.id}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-foreground">Clients</h2>
        <p className="mt-1 text-sm text-muted">Names only. One database, no localStorage.</p>
        <div className="mt-4">
          <CreateClientForm />
        </div>
        {clients.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No clients yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border border-t border-border">
            {clients.map((client) => (
              <li key={client.id} className="py-3 text-sm text-foreground">
                {client.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
