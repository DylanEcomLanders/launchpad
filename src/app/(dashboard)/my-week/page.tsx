import { redirect } from "next/navigation";

// My Week was the founder-only time planner. It's been replaced by My Work
// (personal assigned-deliverables view for everyone). Keep this path as a
// permanent redirect so old links/bookmarks land in the right place.
export default function MyWeekRedirect() {
  redirect("/my-work");
}
