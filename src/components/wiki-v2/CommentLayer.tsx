"use client";

/* ── Wiki v2 inline comment layer ──
 * Wraps a rendered markdown article and adds:
 *   - text selection → "Add comment" floating button
 *   - subtle highlight on any text that already has a comment
 *   - side panel showing the thread when a highlight is clicked
 *   - reply + resolve from the panel
 *
 * Anchors are text-based (selection + ~80 chars before/after) so they
 * survive content edits as long as the surrounding context is intact.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ChatBubbleLeftEllipsisIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import {
  createComment,
  getAuthorName,
  getCommentsForPage,
  setAuthorName,
  setResolved,
  type WikiComment,
} from "@/lib/wiki-v2/comments";

interface Props {
  pageSlug: string;
  children: React.ReactNode;
}

const CONTEXT_CHARS = 80;

interface PendingSelection {
  text: string;
  before: string;
  after: string;
  rect: DOMRect;
}

export function CommentLayer({ pageSlug, children }: Props) {
  const articleRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<WikiComment[]>([]);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ anchor_text: string; anchor_before: string; anchor_after: string } | null>(null);
  const [author, setAuthorState] = useState("");

  /* Initial load + reload whenever the page changes. */
  useEffect(() => {
    let active = true;
    getCommentsForPage(pageSlug).then((c) => {
      if (active) setComments(c);
    });
    setAuthorState(getAuthorName());
    return () => {
      active = false;
    };
  }, [pageSlug]);

  /* Listen for text selection within the article. */
  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setPending(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 3) {
        setPending(null);
        return;
      }
      // Confirm the selection is inside the article
      const root = articleRef.current;
      if (!root) return;
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        setPending(null);
        return;
      }
      // Derive context (before/after) by walking the article's text content
      const articleText = root.innerText;
      const idx = articleText.indexOf(text);
      if (idx === -1) {
        setPending(null);
        return;
      }
      const before = articleText.slice(Math.max(0, idx - CONTEXT_CHARS), idx);
      const after = articleText.slice(idx + text.length, idx + text.length + CONTEXT_CHARS);
      const rect = range.getBoundingClientRect();
      setPending({ text, before, after, rect });
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  /* Apply highlight spans to commented passages after the article renders
   * (or when comments change). Re-locates anchors by fuzzy text match. */
  useLayoutEffect(() => {
    const root = articleRef.current;
    if (!root) return;

    // Clear any prior highlights
    root.querySelectorAll("mark.wv2-hl").forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      parent.normalize();
    });

    // Group comments by anchor (only roots — replies are scoped under their root)
    const roots = comments.filter((c) => !c.parent_id);
    if (roots.length === 0) return;

    // Walk text nodes and wrap matches
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let n: Node | null = walker.nextNode();
    while (n) {
      textNodes.push(n as Text);
      n = walker.nextNode();
    }

    for (const root_comment of roots) {
      const isResolved = !!root_comment.resolved_at;
      // Find first text node containing the anchor text (simple match; good enough for v1)
      for (const node of textNodes) {
        const text = node.nodeValue ?? "";
        const idx = text.indexOf(root_comment.anchor_text);
        if (idx === -1) continue;

        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + root_comment.anchor_text.length);
        const mark = document.createElement("mark");
        mark.className = `wv2-hl${isResolved ? " wv2-hl-resolved" : ""}`;
        mark.dataset.anchor = root_comment.id;
        try {
          range.surroundContents(mark);
        } catch {
          /* selection spans element boundaries; skip for v1 */
        }
        break;
      }
    }
  }, [comments]);

  /* Click handler for highlights — opens the side panel for that anchor. */
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const mark = target.closest("mark.wv2-hl") as HTMLElement | null;
      if (!mark) return;
      const id = mark.dataset.anchor;
      if (id) setActiveAnchor(id);
    }
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [comments]);

  /* Start composing a new comment from the pending selection. */
  const beginCompose = useCallback(() => {
    if (!pending) return;
    setComposing({
      anchor_text: pending.text,
      anchor_before: pending.before,
      anchor_after: pending.after,
    });
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }, [pending]);

  /* Submit a new root comment. */
  async function submitNew(body: string, name: string) {
    if (!composing || !body.trim() || !name.trim()) return;
    setAuthorName(name);
    setAuthorState(name);
    const created = await createComment({
      page_slug: pageSlug,
      anchor_text: composing.anchor_text,
      anchor_before: composing.anchor_before,
      anchor_after: composing.anchor_after,
      body: body.trim(),
      author_name: name.trim(),
    });
    setComments((cur) => [...cur, created]);
    setComposing(null);
    setActiveAnchor(created.id);
  }

  /* Submit a reply under an existing root. */
  async function submitReply(parentId: string, body: string, name: string) {
    if (!body.trim() || !name.trim()) return;
    const parent = comments.find((c) => c.id === parentId);
    if (!parent) return;
    setAuthorName(name);
    setAuthorState(name);
    const created = await createComment({
      page_slug: pageSlug,
      anchor_text: parent.anchor_text,
      anchor_before: parent.anchor_before,
      anchor_after: parent.anchor_after,
      body: body.trim(),
      author_name: name.trim(),
      parent_id: parentId,
    });
    setComments((cur) => [...cur, created]);
  }

  async function toggleResolve(rootId: string) {
    const root = comments.find((c) => c.id === rootId);
    if (!root) return;
    const newResolved = !root.resolved_at;
    await setResolved(rootId, newResolved);
    setComments((cur) =>
      cur.map((c) =>
        c.id === rootId
          ? { ...c, resolved_at: newResolved ? new Date().toISOString() : null }
          : c,
      ),
    );
  }

  const activeRoot = activeAnchor
    ? comments.find((c) => c.id === activeAnchor && !c.parent_id) ?? null
    : null;
  const activeReplies = activeAnchor
    ? comments
        .filter((c) => c.parent_id === activeAnchor)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  return (
    <>
      <div ref={articleRef} className="wv2-comment-host">
        {children}
      </div>

      {/* Floating "Add comment" pill — appears next to a selection */}
      {pending && !composing && (
        <FloatingAddButton rect={pending.rect} onClick={beginCompose} />
      )}

      {/* Compose new comment panel (slides in from the right) */}
      {composing && (
        <SidePanel onClose={() => setComposing(null)}>
          <ComposeForm
            anchorText={composing.anchor_text}
            defaultAuthor={author}
            onSubmit={submitNew}
            onCancel={() => setComposing(null)}
          />
        </SidePanel>
      )}

      {/* Thread panel for an existing anchor */}
      {activeRoot && !composing && (
        <SidePanel onClose={() => setActiveAnchor(null)}>
          <ThreadPanel
            root={activeRoot}
            replies={activeReplies}
            defaultAuthor={author}
            onReply={(body, name) => submitReply(activeRoot.id, body, name)}
            onToggleResolve={() => toggleResolve(activeRoot.id)}
          />
        </SidePanel>
      )}
    </>
  );
}

/* ── Subcomponents ── */

function FloatingAddButton({ rect, onClick }: { rect: DOMRect; onClick: () => void }) {
  // Position above the selection
  const top = rect.top + window.scrollY - 40;
  const left = rect.left + rect.width / 2 + window.scrollX;
  return (
    <button
      onMouseDown={(e) => {
        // Prevent the click from clearing the selection before our handler fires
        e.preventDefault();
        onClick();
      }}
      style={{ position: "absolute", top, left, transform: "translateX(-50%)" }}
      className="z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-raised text-foreground text-[12px] font-medium shadow-lg hover:bg-border transition-colors"
    >
      <ChatBubbleLeftEllipsisIcon className="size-3.5" />
      Add comment
    </button>
  );
}

function SidePanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Close on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[360px] bg-surface border-l border-border shadow-[-8px_0_24px_rgba(0,0,0,0.04)] flex flex-col z-40 animate-slide-in-right">
      <div className="flex items-center justify-between px-4 h-12 border-b border-border">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
          Comments
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-surface-raised transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="size-4 text-subtle" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function ComposeForm({
  anchorText,
  defaultAuthor,
  onSubmit,
  onCancel,
}: {
  anchorText: string;
  defaultAuthor: string;
  onSubmit: (body: string, name: string) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [name, setName] = useState(defaultAuthor);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(body, name);
      }}
      className="p-4 space-y-3"
    >
      <div className="rounded-md bg-[#2A2A1A] px-3 py-2 text-[12px] text-foreground border-l-2 border-[#666622]">
        <span className="line-clamp-3">&ldquo;{anchorText}&rdquo;</span>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        required
        className="w-full px-3 py-1.5 text-[13px] border border-border rounded-md bg-surface-raised focus:outline-none focus:border-white placeholder:text-subtle"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Comment, question, or suggestion..."
        required
        rows={5}
        autoFocus
        className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-surface-raised focus:outline-none focus:border-white placeholder:text-subtle resize-none leading-relaxed"
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-[12px] text-subtle hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim() || !name.trim()}
          className="px-3 py-1.5 text-[12px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Post
        </button>
      </div>
    </form>
  );
}

function ThreadPanel({
  root,
  replies,
  defaultAuthor,
  onReply,
  onToggleResolve,
}: {
  root: WikiComment;
  replies: WikiComment[];
  defaultAuthor: string;
  onReply: (body: string, name: string) => void;
  onToggleResolve: () => void;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [name, setName] = useState(defaultAuthor);
  const resolved = !!root.resolved_at;

  return (
    <div className="p-4 space-y-4">
      <div className={`rounded-md px-3 py-2 text-[12px] border-l-2 ${resolved ? "bg-surface-raised border-muted text-subtle" : "bg-[#FFF9DD] border-[#E0C95F] text-subtle"}`}>
        <span className="line-clamp-3">&ldquo;{root.anchor_text}&rdquo;</span>
      </div>

      <CommentBubble comment={root} />
      {replies.map((r) => (
        <CommentBubble key={r.id} comment={r} indented />
      ))}

      <button
        onClick={onToggleResolve}
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${
          resolved
            ? "border-border text-subtle hover:text-foreground hover:bg-background"
            : "border-border text-success hover:bg-success"
        }`}
      >
        {resolved ? (
          <>
            <ArrowUturnLeftIcon className="size-3.5" />
            Re-open
          </>
        ) : (
          <>
            <CheckCircleIcon className="size-3.5" />
            Resolve
          </>
        )}
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onReply(replyBody, name);
          setReplyBody("");
        }}
        className="space-y-2 pt-2 border-t border-border"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full px-3 py-1.5 text-[12px] border border-border rounded-md bg-surface-raised focus:outline-none focus:border-white placeholder:text-subtle"
        />
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Reply..."
          rows={3}
          className="w-full px-3 py-1.5 text-[12px] border border-border rounded-md bg-surface-raised focus:outline-none focus:border-white placeholder:text-subtle resize-none leading-relaxed"
        />
        <button
          type="submit"
          disabled={!replyBody.trim() || !name.trim()}
          className="w-full px-3 py-1.5 text-[12px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Reply
        </button>
      </form>
    </div>
  );
}

function CommentBubble({ comment, indented }: { comment: WikiComment; indented?: boolean }) {
  const when = relativeTime(comment.created_at);
  return (
    <div className={indented ? "ml-4 pl-3 border-l border-border" : ""}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[12px] font-medium text-foreground">{comment.author_name}</span>
        <span className="text-[11px] text-subtle">{when}</span>
      </div>
      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{comment.body}</p>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
