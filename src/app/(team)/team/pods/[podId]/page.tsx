import PodDetailClient from "@/app/(dashboard)/pods-v2/[podId]/client";

export const metadata = {
  title: "Pod · Team · Launchpad",
};

export default async function TeamPodDetailPage({
  params,
}: {
  params: Promise<{ podId: string }>;
}) {
  const { podId } = await params;
  return <PodDetailClient podId={podId} />;
}
