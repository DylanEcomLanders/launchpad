import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Lightweight .env.local loader so we don't depend on a dotenv package.
try {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* ignore */ }

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const addDays = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
const addDaysIso = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString(); };
const subDays = (d) => { const t = new Date(); t.setDate(t.getDate() - d); return t.toISOString().slice(0, 10); };
const subDaysIso = (d) => { const t = new Date(); t.setDate(t.getDate() - d); return t.toISOString(); };

// ─────────── RETAINER — Lumen Supply Co. ───────────
const retainer = {
  token: randomUUID(),
  client_name: 'Lumen Supply Co.',
  client_type: 'retainer',
  project_type: 'Conversion Engine',
  testing_tier: 'T2',
  current_phase: 'Development',
  progress: 62,
  show_results: true,
  slack_channel_url: 'https://ecomlanders.slack.com/archives/demo-lumen',
  miro_board_url: 'https://miro.com/app/board/uXjVL_lumenDemo=/',
  next_touchpoint: { date: addDays(4), description: 'Weekly strategy review' },
  phases: [
    { id: 'p1', name: 'Kickoff',      status: 'complete',    dates: `${subDays(28)} – ${subDays(21)}`, tasks: 3, completed: 3, description: 'Goals + KPIs aligned' },
    { id: 'p2', name: 'Research',     status: 'complete',    dates: `${subDays(21)} – ${subDays(14)}`, tasks: 4, completed: 4, description: 'VOC + competitor audit' },
    { id: 'p3', name: 'Design',       status: 'complete',    dates: `${subDays(14)} – ${subDays(7)}`,  tasks: 5, completed: 5, description: 'PDP + upsell flows in Figma' },
    { id: 'p4', name: 'Development',  status: 'in-progress', dates: `${subDays(7)} – ${addDays(7)}`,   tasks: 8, completed: 5, description: 'Shopify build + A/B wiring' },
    { id: 'p5', name: 'Launch',       status: 'upcoming',    dates: `${addDays(7)} – ${addDays(10)}`,  tasks: 3, completed: 0, description: 'Go-live + monitor' },
  ],
  scope: [],
  deliverables: [],
  documents: [
    { name: 'Lumen — Strategy Roadmap.pdf',    type: 'Roadmap',   date: subDays(26), url: '' },
    { name: 'Lumen — Retainer Agreement.pdf',  type: 'Agreement', date: subDays(30), url: '' },
    { name: 'Lumen — Scope of Work.pdf',       type: 'Scope',     date: subDays(29), url: '' },
  ],
  funnel_documents: [
    { id: randomUUID(), name: 'Brand tone + voice guide.pdf',  url: 'https://example.com/lumen-voice.pdf', size: 480000,  uploaded_at: subDaysIso(14) },
    { id: randomUUID(), name: 'Q2 test hypotheses.pdf',         url: 'https://example.com/lumen-tests.pdf', size: 920000,  uploaded_at: subDaysIso(7) },
    { id: randomUUID(), name: 'Landing-page benchmarks.png',    url: 'https://example.com/lumen-bench.png', size: 1250000, uploaded_at: subDaysIso(3) },
  ],
  results: [
    { id: randomUUID(), name: 'Hero: benefit-led headline', metric: 'PDP CVR', status: 'complete', result: 'winner',
      cvr: { a: '3.2%', b: '3.9%' }, aov: { a: '£52', b: '£54' },
      week: subDays(14), startDate: subDays(14), endDate: subDays(7),
      figma_url: 'https://figma.com/file/demo1',
      notes: 'Benefit-led headline moved cold-traffic PDP CVR +22% over the generic "Shop now" hero.' },
    { id: randomUUID(), name: 'Mobile sticky ATC',       metric: 'PDP CVR', status: 'live',      week: subDays(3), startDate: subDays(3) },
    { id: randomUUID(), name: 'Bundle upsell on cart',   metric: 'AOV',     status: 'scheduled', week: addDays(3), startDate: addDays(3) },
  ],
  wins: [],
  ad_hoc_requests: [
    { id: randomUUID(), title: 'Add countdown timer above hero', description: 'For Black Friday campaign', status: 'in-progress', requested_at: subDaysIso(2) },
  ],
};

// ─────────── PAGE BUILD — Northfield Naturals ───────────
const pageBuild = {
  token: randomUUID(),
  client_name: 'Northfield Naturals',
  client_type: 'regular',
  project_type: 'Page Build',
  current_phase: 'Design',
  progress: 35,
  show_results: false,
  slack_channel_url: 'https://ecomlanders.slack.com/archives/demo-northfield',
  next_touchpoint: { date: addDays(2), description: 'Design walkthrough' },
  phases: [],
  scope: [],
  deliverables: [],
  documents: [],
  funnel_documents: [],
  results: [],
  wins: [],
  ad_hoc_requests: [],
  projects: [
    {
      id: randomUUID(),
      name: 'Hero Lander + PDP Rebuild',
      type: 'page-build',
      status: 'active',
      created_at: subDays(10),
      current_phase: 'Design',
      progress: 35,
      next_touchpoint: { date: addDays(2), description: 'Design walkthrough' },
      phases: [
        { id: 'ph1', name: 'Onboarding',    status: 'complete',    dates: `${subDays(10)} – ${subDays(8)}`, tasks: 2, completed: 2, description: 'Brief + access handover' },
        { id: 'ph2', name: 'Research',      status: 'complete',    dates: `${subDays(8)} – ${subDays(4)}`,  tasks: 3, completed: 3, description: 'Competitor + VOC audit' },
        { id: 'ph3', name: 'Design',        status: 'in-progress', dates: `${subDays(4)} – ${addDays(3)}`,  tasks: 4, completed: 2, description: 'Hero lander + PDP in Figma' },
        { id: 'ph4', name: 'Design Review', status: 'upcoming',    dates: `${addDays(3)} – ${addDays(5)}`,  tasks: 2, completed: 0, description: 'Client review round' },
        { id: 'ph5', name: 'Development',   status: 'upcoming',    dates: `${addDays(5)} – ${addDays(12)}`, tasks: 5, completed: 0, description: 'Shopify build' },
        { id: 'ph6', name: 'Launch',        status: 'upcoming',    dates: `${addDays(12)} – ${addDays(14)}`, tasks: 3, completed: 0, description: 'QA + go-live' },
      ],
      scope: [
        { description: 'Hero Lander (cold-traffic)', type: 'Hero Lander', design_approved: true,  dev_live: false },
        { description: 'PDP redesign',                type: 'PDP',         design_approved: false, dev_live: false },
        { description: 'Mobile ATC sticky bar',       type: 'PDP',         design_approved: false, dev_live: false },
        { description: 'Post-purchase upsell',        type: 'Other',       design_approved: false, dev_live: false },
      ],
      deliverables: [],
      documents: [
        { name: 'Northfield — Project Roadmap.pdf', type: 'Roadmap',   date: subDays(9),  url: '' },
        { name: 'Northfield — Scope of Work.pdf',   type: 'Scope',     date: subDays(9),  url: '' },
        { name: 'Northfield — Agreement.pdf',       type: 'Agreement', date: subDays(10), url: '' },
      ],
      qa_gates: {
        cro_brief_enabled: true,
        cro_brief: { items: [], notes: '', submitted_by: '', status: 'pending' },
      },
    },
  ],
};

async function insert(row) {
  const res = await fetch(`${SB_URL}/rest/v1/client_portals`, {
    method: 'POST', headers, body: JSON.stringify(row),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`insert failed: ${text}`);
  return JSON.parse(text)[0] || JSON.parse(text);
}

async function insertRoadmapItems(portalId) {
  const items = [
    { portal_id: portalId, title: 'PDP sticky ATC',                stage: 'shipped',     priority: 'high',   asset_type: 'test',   target_month: '',                     impact_hypothesis: 'Keep ATC in view to reduce drop-off', outcome: '+7.4% mobile PDP CVR',    shipped_at: subDaysIso(3) },
    { portal_id: portalId, title: 'Hero headline swap',            stage: 'shipped',     priority: 'medium', asset_type: 'test',   target_month: '',                     impact_hypothesis: 'Benefit-led beats "Shop now"',         outcome: '+22% cold-traffic PDP CVR', shipped_at: subDaysIso(10) },
    { portal_id: portalId, title: 'Bundle builder rebuild',        stage: 'in-progress', priority: 'high',   asset_type: 'page',   target_month: addDays(14).slice(0, 7), impact_hypothesis: 'Expect +8–12% AOV from clearer bundle UX' },
    { portal_id: portalId, title: 'Post-purchase one-click upsell', stage: 'in-progress', priority: 'medium', asset_type: 'upsell', target_month: addDays(14).slice(0, 7), impact_hypothesis: 'Capture 10–15% of orders with low-friction add-on' },
    { portal_id: portalId, title: 'Advertorial for TikTok traffic', stage: 'next-up',    priority: 'high',   asset_type: 'page',   target_month: addDays(30).slice(0, 7), impact_hypothesis: 'Warm cold TikTok traffic before PDP' },
    { portal_id: portalId, title: 'Trust-badge row under CTAs',    stage: 'next-up',     priority: 'low',    asset_type: 'test',   target_month: addDays(30).slice(0, 7), impact_hypothesis: 'Small lift on first-time buyer trust' },
    { portal_id: portalId, title: 'Subscription discount ladder',  stage: 'backlog',     priority: 'medium', asset_type: 'test',   target_month: '',                     impact_hypothesis: 'Tiered sub discount to drive LTV' },
    { portal_id: portalId, title: 'Collection page redesign',      stage: 'backlog',     priority: 'low',    asset_type: 'page',   target_month: '',                     impact_hypothesis: 'Better browse-to-PDP flow' },
  ];
  for (const item of items) {
    const res = await fetch(`${SB_URL}/rest/v1/roadmap_items`, {
      method: 'POST', headers, body: JSON.stringify(item),
    });
    if (!res.ok) console.error('roadmap insert failed for', item.title, await res.text());
  }
  return items.length;
}

(async () => {
  const r = await insert(retainer);
  console.log('\n✓ Retainer created —', r.client_name);
  const count = await insertRoadmapItems(r.id);
  console.log('  + ' + count + ' roadmap items');
  console.log('  URL: https://ecomlanders.app/portal/' + r.token);

  const p = await insert(pageBuild);
  console.log('\n✓ Page build created —', p.client_name);
  console.log('  URL: https://ecomlanders.app/portal/' + p.token);
})().catch((e) => { console.error(e); process.exit(1); });
