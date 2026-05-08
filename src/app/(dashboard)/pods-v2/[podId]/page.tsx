import PodDetailClient from "./client";

export const metadata = {
  title: "Pod · Pod Overview · Launchpad",
};

export default async function PodPage({
  params,
}: {
  params: Promise<{ podId: string }>;
}) {
  const { podId } = await params;
  return <PodDetailClient podId={podId} />;
}
