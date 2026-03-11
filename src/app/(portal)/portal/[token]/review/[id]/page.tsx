import { getPortalByToken } from "@/lib/portal/data";
import { getReviewById, getVersions, getFeedback } from "@/lib/portal/reviews";
import { ReviewView } from "./review-view";

interface Props {
  params: Promise<{ token: string; id: string }>;
}

export default async function DesignReviewPage({ params }: Props) {
  const { token, id } = await params;

  // Validate portal token
  const portal = await getPortalByToken(token);
  if (!portal) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F5F5F5] mb-6">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Not Found</h1>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          This link is invalid or has been removed.
        </p>
      </div>
    );
  }

  // Load review data
  const review = await getReviewById(id);
  if (!review || review.portal_id !== portal.id) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F5F5F5] mb-6">
          <span className="text-2xl">📋</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Review Not Found</h1>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          This design review may have been removed or the link is incorrect.
        </p>
      </div>
    );
  }

  const [versions, feedback] = await Promise.all([
    getVersions(id),
    getFeedback(id),
  ]);

  return (
    <ReviewView
      review={review}
      versions={versions}
      feedback={feedback}
      token={token}
      clientName={portal.client_name}
    />
  );
}
