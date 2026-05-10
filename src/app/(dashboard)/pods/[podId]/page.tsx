import PodDetailClient from "./client";

export const metadata = {
  title: "Pod · Launchpad",
};

export default async function PodDetailPage({ params }: { params: Promise<{ podId: string }> }) {
  const { podId } = await params;
  return <PodDetailClient podId={podId} />;
}
