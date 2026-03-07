import { getPortalByToken } from "@/lib/portal-types";
import { PortalView } from "./portal-view";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: Props) {
  const { token } = await params;
  const portal = getPortalByToken(token);

  if (!portal) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F5F5F5] mb-6">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Portal Not Found</h1>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          This portal link is invalid or has been removed. Please contact your
          project manager for an updated link.
        </p>
      </div>
    );
  }

  return <PortalView portal={portal} />;
}
