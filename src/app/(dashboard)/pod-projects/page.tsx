import { redirect } from "next/navigation";

/* The pod delivery workspace now lives at /clients — keep old URLs working. */
export default function PodProjectsRedirect() {
  redirect("/clients");
}
