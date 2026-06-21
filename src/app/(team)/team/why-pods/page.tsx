import Link from "next/link";
import {
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

/* ── Why Pods ──
 * Team-facing context page on the new operating system. Reference
 * material — designed for "read once, pop it open when you need a
 * reminder". Eight sections matching the launch deck, restyled for
 * Launchpad. Lives next to /pods-v2.
 */

export const metadata = {
  title: "Why Pods · Team · Launchpad",
};

const POD_DEFINITIONS: Array<{
  name: string;
  tagline: string;
  members: Array<{ name: string; role: string; placeholder?: boolean }>;
}> = [
  {
    name: "Pod 1",
    tagline: "Barnaby's pod",
    members: [
      { name: "Barnaby", role: "Senior designer" },
      { name: "Victoria", role: "Junior designer" },
      { name: "Angel", role: "Senior dev" },
      { name: "Kaye", role: "Junior dev" },
    ],
  },
  {
    name: "Pod 2",
    tagline: "Jack's pod",
    members: [
      { name: "Jack", role: "Senior designer" },
      { name: "Anastasia", role: "Junior designer" },
      { name: "Ian", role: "Senior dev" },
      { name: "Clien", role: "Junior dev" },
    ],
  },
  {
    name: "Pod 3",
    tagline: "Brandon's pod",
    members: [
      { name: "Brandon", role: "Senior designer" },
      { name: "To hire", role: "Junior designer", placeholder: true },
      { name: "Hitesh", role: "Senior dev" },
      { name: "Ashish", role: "Junior dev" },
    ],
  },
];

const WEEK: Array<{
  day: string;
  tag: string;
  job: string;
  bullets: string[];
  client?: boolean;
}> = [
  {
    day: "Mon",
    tag: "Kickoff day",
    job: "Project starts",
    bullets: [
      "All new projects begin",
      "Pod meeting, scope, brief",
      "Strategy + design lock",
      "One slot per kickoff",
    ],
  },
  {
    day: "Tue",
    tag: "Heads-down",
    job: "Design + dev",
    bullets: [
      "No meetings",
      "No client calls",
      "Pure production",
      "Comms in Slack only",
    ],
  },
  {
    day: "Wed",
    tag: "Wraps + review",
    job: "Internal QA",
    bullets: [
      "Design wraps",
      "Senior review",
      "QA pass on dev",
      "Ready for Thursday",
    ],
  },
  {
    day: "Thu",
    tag: "Client day",
    job: "Designs out + launch",
    bullets: [
      "Designs sent AM",
      "Builds launch PM",
      "The only contact day",
      "Visible delivery",
    ],
    client: true,
  },
  {
    day: "Fri",
    tag: "Buffer",
    job: "Catch-up",
    bullets: [
      "Revisions if needed",
      "Library contributions",
      "Retros",
      "Plan next Monday",
    ],
  },
];

const BUCKETS: Array<{
  letter: string;
  points: string;
  description: string;
  duration: string;
}> = [
  {
    letter: "A",
    points: "≤6",
    description: "1-2 page projects. Single PDP, homepage, advertorials. Most of what we ship.",
    duration: "10 days",
  },
  {
    letter: "B",
    points: "7-10",
    description: "3-4 page projects. Homepage + 2 PDPs. Multi-PDP same brand. The mid-range.",
    duration: "15 days",
  },
  {
    letter: "C",
    points: "11-20",
    description: "Full sites — homepage + multiple PDPs + secondary and tertiary pages.",
    duration: "20 days",
  },
];

const PRACTICE: Array<{ num: string; title: string; body: string }> = [
  {
    num: "01",
    title: "Your Mondays kick off projects.",
    body: "One day, one job: project starts. You walk in, your pod gets briefed, you spend the day designing. No fragmented mornings or “got a sec?” interruptions.",
  },
  {
    num: "02",
    title: "Your Tue-Wed is heads-down.",
    body: "No meetings, no client calls, no cross-pod hopping. Two full days where the only thing you owe anyone is the work you said you'd do.",
  },
  {
    num: "03",
    title: "Your Thursday is when you ship.",
    body: "Designs go out in the morning, builds launch in the afternoon. Thursday is the only day clients see your work — and the only day you hear from them.",
  },
];

export default function WhyPodsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      {/* Back link */}
      <Link
        href="/team"
        className="inline-flex items-center gap-1 text-xs text-[#71757D] hover:text-[#E5E5EA]"
      >
        <ChevronLeftIcon className="size-3.5" />
        Back to Team Tools
      </Link>

      {/* Hero */}
      <div className="mt-6 rounded-2xl border border-[#2A2A2A] bg-[#181818] p-8 shadow-[var(--shadow-soft)] md:p-12">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#16A34A]">
          Internal · For the team · Reference v1
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] text-[#E5E5EA] md:text-5xl">
          How we work,<br />
          and <span className="italic text-[#16A34A]">why</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#71757D] md:text-base">
          A short reference that lives next to your pod board. What pods are, how the week runs, what we measure, and why we changed the system. Read once. Pop it open whenever you need a reminder.
        </p>
      </div>

      {/* Why we changed */}
      <Section number="01" eyebrow="Why we changed" title={<>The old way didn't work.<br /><span className="italic text-[#16A34A]">We were burning out.</span></>}>
        <p className="text-sm leading-relaxed text-[#C7C9CD] md:text-[15px]">
          Projects starting any day, ending any time. Mid-week kickoffs piling onto unfinished work. Designers context-switching between five clients before lunch. Devs blocked on revisions that should have shipped Tuesday. Thursday delivery was a hope, not a commitment.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#C7C9CD] md:text-[15px]">
          The system below isn't extra rules — it's protection. <strong className="text-[#E5E5EA]">Protection for your hours, your focus, and the work being good.</strong>
        </p>
      </Section>

      {/* Headline */}
      <Section number="02" eyebrow="In one sentence" title={<>Same work. Predictable rhythm.<br /><span className="italic text-[#16A34A]">One day, one job.</span></>}>
        <p className="text-sm leading-relaxed text-[#C7C9CD] md:text-[15px]">
          Five days, five distinct jobs. Three pods, twelve people. Thursday delivery, every time. The work doesn't change — the chaos around it does.
        </p>
      </Section>

      {/* The week */}
      <Section number="03" eyebrow="Cadence" title="Each day has one job. Thursday is the only day clients hear from us.">
        <p className="mb-5 text-sm leading-relaxed text-[#C7C9CD] md:text-[15px]">
          Five days, five distinct jobs. Monday is project kickoffs. Tuesday and Wednesday are heads-down design and dev. Thursday is the only client-facing day — designs out, launches live. Friday is buffer, retros, and library work. No client comms outside Thursday. No mid-week kickoffs.
        </p>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#E5E5EA] md:grid-cols-5">
          {WEEK.map((d) => (
            <div
              key={d.day}
              className={`flex flex-col gap-2.5 p-5 ${d.client ? "bg-[#F0FDF4]" : "bg-[#181818]"}`}
            >
              <div className={`text-2xl font-semibold leading-none ${d.client ? "text-[#16A34A]" : "text-[#E5E5EA]"}`}>
                {d.day}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                {d.tag}
              </div>
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${d.client ? "text-[#16A34A]" : "text-[#E5E5EA]"}`}>
                {d.job}
              </div>
              <ul className="mt-1 space-y-1.5 text-[12px] leading-snug text-[#C7C9CD]">
                {d.bullets.map((b) => (
                  <li key={b} className="flex gap-1.5">
                    <span className="text-[#16A34A]">→</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* The pods */}
      <Section number="04" eyebrow="Your pod, your team" title="Three pods of four. One senior and one junior on each side.">
        <p className="mb-5 text-sm leading-relaxed text-[#C7C9CD] md:text-[15px]">
          From Monday, every project gets assigned to one pod and that pod owns it end-to-end — kickoff, design, dev, QA, launch. Four people per pod: senior designer, junior designer, senior dev, junior dev. The senior runs the design or dev decisions; the junior supports with revisions, asset prep, library work — and grows toward senior over six months. You'll know your pod, your pod-mates, and your senior.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {POD_DEFINITIONS.map((pod) => (
            <div key={pod.name} className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-5 shadow-[var(--shadow-soft)]">
              <div className="text-2xl font-semibold italic text-[#16A34A]">{pod.name}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                {pod.tagline}
              </div>
              <div className="mt-4 divide-y divide-[#2A2A2A]">
                {pod.members.map((m) => (
                  <div
                    key={m.name + m.role}
                    className="flex items-baseline justify-between gap-3 py-2.5"
                  >
                    <span
                      className={`text-sm font-medium ${m.placeholder ? "italic text-[#16A34A]" : "text-[#E5E5EA]"}`}
                    >
                      {m.name}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Buckets */}
      <Section number="05" eyebrow="How project size works" title="Three buckets. Three durations. Set on Monday, delivered on Thursday.">
        <p className="mb-5 text-sm leading-relaxed text-[#C7C9CD] md:text-[15px]">
          Every project gets sized into a bucket on the Monday it kicks off. Heavy pages (PDP, homepage, quiz) are 3 points. Medium (advertorial, listicle, collection) are 2. Light (cart, FAQ, policies) are 1. The total tells us the bucket. The bucket tells us the Thursday it ships. No more "when's it ready?" — the calendar tells you.
        </p>
        <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-soft)]">
          {BUCKETS.map((b, i) => (
            <div
              key={b.letter}
              className={`grid grid-cols-[60px_120px_1fr_auto] items-center gap-6 px-6 py-5 ${i > 0 ? "border-t border-[#2A2A2A]" : ""}`}
            >
              <div className="text-5xl font-semibold italic leading-none text-[#16A34A]">
                {b.letter}
              </div>
              <div>
                <div className="text-2xl font-medium text-[#E5E5EA]">{b.points}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                  points
                </div>
              </div>
              <div className="text-sm leading-relaxed text-[#C7C9CD]">{b.description}</div>
              <div className="text-xs font-semibold tracking-wider text-[#16A34A]">
                {b.duration}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Monday Protocol */}
      <Section number="06" eyebrow="The Monday Protocol" title="Standard kicks off Monday. Rush is the only mid-week exception.">
        <p className="mb-5 text-sm leading-relaxed text-[#C7C9CD] md:text-[15px]">
          Two ways a project can hit your pod. Standard projects sign by Friday and kick off the next Monday — that's the default, and 90% of work will run this way. Strategy work (research, brand-warm setup, roadmap) begins the moment a client signs, so by Monday morning you've got context not a cold start. Rush is the rare exception: mid-week start, half timeline. It only happens when a pod has actual capacity for it.
        </p>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#E5E5EA] md:grid-cols-2">
          <div className="bg-[#181818] p-6">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
              Standard — the default
            </div>
            <div className="mt-2 text-3xl font-semibold leading-tight text-[#E5E5EA]">
              Monday <span className="text-base font-normal text-[#71757D]">kickoff</span>
            </div>
            <ul className="mt-4 space-y-2 text-[13px] leading-snug text-[#C7C9CD]">
              {[
                "Sign by Friday 5pm",
                "Strategy starts immediately",
                "Design begins the next Monday",
                "Delivery Thursday in bucket window",
                "90% of projects run this way",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-[#16A34A]">→</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#FEF3C7] p-6">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#B45309]">
              Rush — the override
            </div>
            <div className="mt-2 text-3xl font-semibold leading-tight text-[#B45309]">
              Mid-week <span className="text-base font-normal opacity-70">start</span>
            </div>
            <ul className="mt-4 space-y-2 text-[13px] leading-snug text-[#7A4A07]">
              {[
                "Only when pod has capacity",
                "Mid-week start permitted",
                "Compressed delivery (50% timeline)",
                "Used sparingly, by exception",
                "The rare exception, not the rule",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-[#B45309]">→</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Practice / what you get back */}
      <Section number="07" eyebrow="What you get back" title={<>Predictable Thursdays. Protected hours.<br /><span className="italic text-[#16A34A]">Work that's actually yours.</span></>}>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRACTICE.map((p) => (
            <div key={p.num} className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-6 shadow-[var(--shadow-soft)]">
              <div className="text-4xl font-semibold italic leading-none text-[#16A34A]">
                {p.num}
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug text-[#E5E5EA]">
                {p.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#C7C9CD]">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Sign-off */}
      <div className="mt-10 rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C] p-8 text-center md:p-12">
        <p className="text-sm italic leading-relaxed text-[#C7C9CD] md:text-base">
          Questions, ask your pod's senior, or Alister. The full operating system docs are in the team folder. <strong className="not-italic text-[#E5E5EA]">Welcome to the new rhythm.</strong>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/pods-v2?view=team"
            className="rounded-lg bg-[#222222] px-4 py-2 text-xs font-medium text-[#E5E5EA] hover:bg-[#2A2A2A]"
          >
            Open your pod board →
          </Link>
          <Link
            href="/team"
            className="rounded-lg border border-[#2A2A2A] bg-[#181818] px-4 py-2 text-xs font-medium text-[#E5E5EA] hover:border-[#1B1B1B]"
          >
            Back to Team Tools
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  number,
  eyebrow,
  title,
  children,
}: {
  number: string;
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline gap-3 text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
        <span className="text-[#E5E5EA]">{number}</span>
        <span>·</span>
        <span className="text-[#16A34A]">{eyebrow}</span>
      </div>
      <h2 className="text-2xl font-semibold leading-tight text-[#E5E5EA] md:text-[32px] md:leading-[1.15]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
