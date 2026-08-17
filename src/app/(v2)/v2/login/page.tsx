import { redirect } from "next/navigation";
import { getV2User } from "@/lib/v2/auth";
import { V2LoginForm } from "./login-form";

export default async function V2LoginPage() {
  const user = await getV2User();
  if (user) redirect("/v2");

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-subtle">
          Launchpad 2.0
        </p>
        <h1 className="mt-2 text-xl font-medium text-foreground">Sign in as yourself</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Email and password. Shared access codes are not accepted here.
        </p>
        <div className="mt-8">
          <V2LoginForm />
        </div>
      </div>
    </div>
  );
}
