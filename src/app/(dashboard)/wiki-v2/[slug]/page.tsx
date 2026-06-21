import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllPages, getPageBySlug } from "@/lib/wiki-v2/data";
import { CommentLayer } from "@/components/wiki-v2/CommentLayer";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllPages().map((p) => ({ slug: p.slug }));
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <div className="mb-6 flex items-center gap-2 text-[12px] text-[#71757D]">
        <Link href="/wiki-v2" className="hover:text-[#E5E5EA] transition-colors">
          Wiki
        </Link>
        <span className="text-[#D5D5D5]">/</span>
        <span className="text-[#71757D]">{page.section}</span>
      </div>

      <h1 className="text-[34px] font-semibold text-[#E5E5EA] leading-tight mb-10">
        {page.title}
      </h1>

      <CommentLayer pageSlug={page.slug}>
        <article className="wiki-article prose prose-neutral max-w-none prose-headings:text-[#E5E5EA] prose-h2:text-[20px] prose-h2:font-semibold prose-p:text-[#E5E5EA] prose-p:leading-relaxed prose-a:text-[#E5E5EA] prose-a:underline prose-a:underline-offset-2 prose-code:bg-[#222222] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#0C0C0C] prose-pre:text-white">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
        </article>
      </CommentLayer>
    </div>
  );
}
