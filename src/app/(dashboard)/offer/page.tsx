import { redirect } from "next/navigation";

/* /offer was a portfolio-preview hub that duplicated the real offer surface.
 * Consolidated: the offer now lives at /hero-offer. */
export default function OfferPage() {
  redirect("/hero-offer");
}
