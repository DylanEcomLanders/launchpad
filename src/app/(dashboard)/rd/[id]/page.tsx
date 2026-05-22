import InitiativeDetailClient from "./client";

export const metadata = {
  title: "Initiative · R&D Tracker · Launchpad",
};

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InitiativeDetailClient id={id} />;
}
