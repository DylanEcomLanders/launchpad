import Link from "next/link";
import { WorkChrome } from "./chrome";

export default function WorkNotFound() {
  return (
    <div className="min-h-screen">
      <WorkChrome />
      <div className="px-5 md:px-8 pt-24 max-w-xl">
        <h1
          className="text-4xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          That page isn’t on the lookbook.
        </h1>
        <p className="mt-4 text-[var(--work-mute)] leading-relaxed">
          It may still live in the Figma archive, or it hasn’t been synced yet.
        </p>
        <Link
          href="/work"
          className="inline-block mt-8 text-sm border-b border-[var(--work-ink)] pb-0.5"
        >
          Back to work
        </Link>
      </div>
    </div>
  );
}
