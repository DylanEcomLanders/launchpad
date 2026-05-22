import IdeaDetailClient from "./client";

export const metadata = {
  title: "Idea · R&D Tracker · Launchpad",
};

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IdeaDetailClient id={id} />;
}
