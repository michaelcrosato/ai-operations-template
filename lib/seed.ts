import { DEFAULT_MODEL } from '@/lib/models';

/**
 * ForgeOps Demo Seed
 * Rich, deterministic, self-contained client-side data showcasing:
 * - 3 Workspaces (free/pro/team tiers)
 * - 5 Workflows as serializable graphs (agent, human-gate, parallel, tool, merge nodes + Grok models)
 * - 25+ Executions (varied status, 8-15 detailed logs each w/ timestamps, per-step costs, traces)
 * - 12 Templates (categories, descriptions, ratings, reusable sample graphs)
 * - Team/RBAC personas (owner/admin/editor/viewer)
 * - A/B experiments
 * - Usage snapshots + billing awareness
 *
 * All values realistic: costs $0.01-$17.82, durations, success mix ~94%, Grok-4.3 references.
 * No randomness at runtime — fully deterministic for reproducible demos.
 * Keep client-only (no DB, no secrets). Swap to Supabase later by replacing this module.
 */

export type NodeType =
  | 'start'
  | 'agent'
  | 'tool'
  | 'human-gate'
  | 'parallel'
  | 'merge'
  | 'end';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  model?: string; // Grok family
  prompt?: string;
  tool?: string;
  estimatedCost?: number;
  timeoutSec?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Workspace {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'team';
  memberCount: number;
  workflowCount: number;
  monthlySpend: number; // USD
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  graph: WorkflowGraph;
  version: number;
  lastRunAt: string;
  avgCost: number;
  successRate: number;
}

export interface ExecutionLog {
  ts: string; // '2026-06-11 14:22:07'
  nodeId: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'cost' | 'gate';
  costDelta?: number;
  tokens?: number;
  latencyMs?: number;
}

export interface Execution {
  id: string;
  workflowId: string;
  workspaceId: string;
  status: 'running' | 'succeeded' | 'failed' | 'paused';
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  totalCost: number;
  tokens: number;
  logs: ExecutionLog[];
  trace: string[]; // high-level step trace for monitoring view
  triggeredBy: string; // user email
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  usageCount: number;
  sampleGraph: WorkflowGraph;
  tags: string[];
  estimatedAvgCost: number;
  author: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  workspaceId: string;
  avatar?: string;
}

export interface ABExperiment {
  id: string;
  name: string;
  workflowId: string;
  variantA: { name: string; model: string; config: Record<string, unknown> };
  variantB: { name: string; model: string; config: Record<string, unknown> };
  runsA: number;
  runsB: number;
  successA: number; // percent
  successB: number;
  costA: number;
  costB: number;
  winner?: 'A' | 'B' | 'tie';
  status: 'running' | 'completed';
}

export interface UsageSnapshot {
  period: string;
  totalSpend: number;
  executions: number;
  tokens: number;
  avgCostPerExec: number;
  successRate: number;
  byTierBreakdown: Record<string, number>;
}

export interface DemoSeed {
  workspaces: Workspace[];
  workflows: Workflow[];
  executions: Execution[];
  templates: Template[];
  team: TeamMember[];
  experiments: ABExperiment[];
  usage: UsageSnapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic helpers (no Math.random in final data)
function pos(x: number, y: number) { return { x, y }; }
function mkNode(id: string, type: NodeType, label: string, p: { x: number; y: number }, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, type, label, position: p, ...extra };
}
function mkEdge(id: string, source: string, target: string, label?: string): GraphEdge {
  return { id, source, target, label };
}
function cost(n: number) { return Math.round(n * 100) / 100; }
function dur(ms: number) { return ms; }

// ─────────────────────────────────────────────────────────────────────────────
// 3 WORKSPACES
const workspaces: Workspace[] = [
  { id: 'ws_acme', name: 'Acme Research', plan: 'team', memberCount: 12, workflowCount: 47, monthlySpend: 187.43 },
  { id: 'ws_stellar', name: 'Stellar Startup', plan: 'pro', memberCount: 4, workflowCount: 19, monthlySpend: 64.12 },
  { id: 'ws_personal', name: 'Personal Projects', plan: 'free', memberCount: 1, workflowCount: 6, monthlySpend: 8.79 },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5 RICH SERIALIZABLE WORKFLOW GRAPHS (realistic multi-node structures)
const researchGraph: WorkflowGraph = {
  nodes: [
    mkNode('n_start', 'start', 'Research Brief', pos(40, 140)),
    mkNode('n_plan', 'agent', 'Query Planner', pos(180, 110), { model: DEFAULT_MODEL, prompt: 'Decompose into 4-7 sub-questions + source strategy', estimatedCost: 0.09 }),
    mkNode('n_par', 'parallel', 'Parallel Research', pos(360, 140)),
    mkNode('n_r1', 'agent', 'Academic Researcher', pos(520, 60), { model: DEFAULT_MODEL, prompt: 'Deep-dive academic + arXiv + papers', estimatedCost: 1.82 }),
    mkNode('n_r2', 'agent', 'Web + News Scout', pos(520, 140), { model: DEFAULT_MODEL, prompt: 'Recent news, company filings, analyst notes', estimatedCost: 0.94 }),
    mkNode('n_r3', 'agent', 'Competitor Analyst', pos(520, 220), { model: DEFAULT_MODEL, prompt: 'Compare 3 closest competitors on pricing/features', estimatedCost: 0.71 }),
    mkNode('n_merge', 'merge', 'Merge & Dedup', pos(680, 140)),
    mkNode('n_gate', 'human-gate', 'Human Review Gate', pos(820, 140), { timeoutSec: 3600 }),
    mkNode('n_synth', 'agent', 'Synthesizer + Report', pos(960, 110), { model: DEFAULT_MODEL, prompt: 'Produce structured 8-section report + citations + confidence scores', estimatedCost: 2.14 }),
    mkNode('n_export', 'tool', 'Export PDF + Notion', pos(1100, 140), { tool: 'notion.export + pdf.render' }),
    mkNode('n_end', 'end', 'Complete', pos(1220, 140)),
  ],
  edges: [
    mkEdge('e1', 'n_start', 'n_plan'),
    mkEdge('e2', 'n_plan', 'n_par'),
    mkEdge('e3', 'n_par', 'n_r1', 'branch'),
    mkEdge('e4', 'n_par', 'n_r2', 'branch'),
    mkEdge('e5', 'n_par', 'n_r3', 'branch'),
    mkEdge('e6', 'n_r1', 'n_merge'),
    mkEdge('e7', 'n_r2', 'n_merge'),
    mkEdge('e8', 'n_r3', 'n_merge'),
    mkEdge('e9', 'n_merge', 'n_gate'),
    mkEdge('e10', 'n_gate', 'n_synth'),
    mkEdge('e11', 'n_synth', 'n_export'),
    mkEdge('e12', 'n_export', 'n_end'),
  ],
};

const supportGraph: WorkflowGraph = {
  nodes: [
    mkNode('s_start', 'start', 'Incoming Ticket', pos(60, 120)),
    mkNode('s_class', 'agent', 'Triage Classifier', pos(200, 90), { model: DEFAULT_MODEL, prompt: 'Urgency + topic + sentiment + account tier', estimatedCost: 0.03 }),
    mkNode('s_kb', 'tool', 'Knowledge Base Lookup', pos(360, 70), { tool: 'kb.search + vector' }),
    mkNode('s_gate', 'human-gate', 'Escalation Approval', pos(520, 120), { timeoutSec: 900 }),
    mkNode('s_reply', 'agent', 'Draft Empathetic Reply', pos(680, 80), { model: DEFAULT_MODEL, prompt: 'Write reply + suggested actions + internal note', estimatedCost: 0.11 }),
    mkNode('s_par', 'parallel', 'Parallel Actions', pos(840, 120)),
    mkNode('s_email', 'tool', 'Send Email + Log', pos(980, 60), { tool: 'email.send' }),
    mkNode('s_crm', 'tool', 'Update CRM + SLA', pos(980, 160), { tool: 'hubspot.patch' }),
    mkNode('s_end', 'end', 'Resolved', pos(1120, 120)),
  ],
  edges: [
    mkEdge('se1', 's_start', 's_class'),
    mkEdge('se2', 's_class', 's_kb'),
    mkEdge('se3', 's_kb', 's_gate'),
    mkEdge('se4', 's_gate', 's_reply'),
    mkEdge('se5', 's_reply', 's_par'),
    mkEdge('se6', 's_par', 's_email'),
    mkEdge('se7', 's_par', 's_crm'),
    mkEdge('se8', 's_email', 's_end'),
    mkEdge('se9', 's_crm', 's_end'),
  ],
};

const contentGraph: WorkflowGraph = {
  nodes: [
    mkNode('c_start', 'start', 'Brief + Keywords', pos(50, 130)),
    mkNode('c_research', 'agent', 'Angle Researcher', pos(190, 90), { model: DEFAULT_MODEL, prompt: 'Find 3-5 fresh angles + data points', estimatedCost: 0.67 }),
    mkNode('c_par', 'parallel', 'Parallel Writers', pos(370, 130)),
    mkNode('c_w1', 'agent', 'Long-form Writer', pos(530, 50), { model: DEFAULT_MODEL, prompt: '2,200 word draft', estimatedCost: 1.41 }),
    mkNode('c_w2', 'agent', 'Social Thread Writer', pos(530, 130), { model: DEFAULT_MODEL, prompt: 'LinkedIn + X thread variants', estimatedCost: 0.28 }),
    mkNode('c_w3', 'agent', 'SEO Optimizer', pos(530, 210), { model: DEFAULT_MODEL, prompt: 'Meta, headings, internal links', estimatedCost: 0.19 }),
    mkNode('c_merge', 'merge', 'Consolidate', pos(700, 130)),
    mkNode('c_gate', 'human-gate', 'Brand Voice Gate', pos(840, 130)),
    mkNode('c_final', 'agent', 'Final Polish + Assets', pos(990, 100), { model: DEFAULT_MODEL, prompt: 'Apply voice + generate hero image prompt + checklist', estimatedCost: 0.44 }),
    mkNode('c_export', 'tool', 'Publish to CMS', pos(1140, 130), { tool: 'webflow.publish + notion' }),
    mkNode('c_end', 'end', 'Published', pos(1260, 130)),
  ],
  edges: [
    mkEdge('ce1', 'c_start', 'c_research'),
    mkEdge('ce2', 'c_research', 'c_par'),
    mkEdge('ce3', 'c_par', 'c_w1'), mkEdge('ce4', 'c_par', 'c_w2'), mkEdge('ce5', 'c_par', 'c_w3'),
    mkEdge('ce6', 'c_w1', 'c_merge'), mkEdge('ce7', 'c_w2', 'c_merge'), mkEdge('ce8', 'c_w3', 'c_merge'),
    mkEdge('ce9', 'c_merge', 'c_gate'),
    mkEdge('ce10', 'c_gate', 'c_final'),
    mkEdge('ce11', 'c_final', 'c_export'),
    mkEdge('ce12', 'c_export', 'c_end'),
  ],
};

const intelGraph: WorkflowGraph = {
  nodes: [
    mkNode('i_start', 'start', 'Daily Trigger', pos(60, 120)),
    mkNode('i_fetch', 'tool', 'Scrape 8 Sources', pos(200, 90), { tool: 'firecrawl.batch' }),
    mkNode('i_anal', 'agent', 'Signal Detector (Grok-4.3)', pos(370, 90), { model: DEFAULT_MODEL, prompt: 'Extract pricing moves, hiring, funding, product launches', estimatedCost: 0.83 }),
    mkNode('i_ab', 'parallel', 'A/B Variant Runners', pos(540, 120)), // used by experiments too
    mkNode('i_a', 'agent', 'Variant A: Grok-4.3 Heavy', pos(700, 60), { model: DEFAULT_MODEL, prompt: 'Deep narrative + risk assessment', estimatedCost: 1.12 }),
    mkNode('i_b', 'agent', 'Variant B: Fast Grok-4.3', pos(700, 170), { model: DEFAULT_MODEL, prompt: 'Bullet summary + links', estimatedCost: 0.31 }),
    mkNode('i_merge', 'merge', 'Compare Outputs', pos(860, 120)),
    mkNode('i_end', 'end', 'Alert + Digest', pos(1000, 120)),
  ],
  edges: [
    mkEdge('ie1', 'i_start', 'i_fetch'),
    mkEdge('ie2', 'i_fetch', 'i_anal'),
    mkEdge('ie3', 'i_anal', 'i_ab'),
    mkEdge('ie4', 'i_ab', 'i_a'), mkEdge('ie5', 'i_ab', 'i_b'),
    mkEdge('ie6', 'i_a', 'i_merge'), mkEdge('ie7', 'i_b', 'i_merge'),
    mkEdge('ie8', 'i_merge', 'i_end'),
  ],
};

const triageGraph: WorkflowGraph = {
  nodes: [
    mkNode('t_start', 'start', 'Bug / Incident', pos(50, 110)),
    mkNode('t_class', 'agent', 'Severity + Repro Agent', pos(190, 80), { model: DEFAULT_MODEL, prompt: 'Classify + extract repro steps from logs', estimatedCost: 0.07 }),
    mkNode('t_search', 'tool', 'Similar Issues Search', pos(340, 110), { tool: 'github.search + linear' }),
    mkNode('t_par', 'parallel', 'Fix Paths', pos(500, 110)),
    mkNode('t_code', 'agent', 'Code Suggestion', pos(650, 50), { model: DEFAULT_MODEL, prompt: 'Propose minimal patch + tests', estimatedCost: 0.92 }),
    mkNode('t_owner', 'human-gate', 'Assign Owner + ETA', pos(650, 160)),
    mkNode('t_merge', 'merge', 'Decision Merge', pos(810, 110)),
    mkNode('t_notify', 'tool', 'Slack + Linear Update', pos(950, 80), { tool: 'slack.post + linear.create' }),
    mkNode('t_end', 'end', 'Tracked', pos(1080, 110)),
  ],
  edges: [
    mkEdge('te1', 't_start', 't_class'),
    mkEdge('te2', 't_class', 't_search'),
    mkEdge('te3', 't_search', 't_par'),
    mkEdge('te4', 't_par', 't_code'), mkEdge('te5', 't_par', 't_owner'),
    mkEdge('te6', 't_code', 't_merge'), mkEdge('te7', 't_owner', 't_merge'),
    mkEdge('te8', 't_merge', 't_notify'),
    mkEdge('te9', 't_notify', 't_end'),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 5 WORKFLOWS (distributed across workspaces)
const workflows: Workflow[] = [
  {
    id: 'wf_research', name: 'Deep Research & Synthesis Swarm', description: 'Multi-source academic + competitive research with human gate before expensive synthesis.',
    workspaceId: 'ws_acme', graph: researchGraph, version: 4, lastRunAt: '2026-06-11T19:41:00Z', avgCost: 6.82, successRate: 96.1,
  },
  {
    id: 'wf_support', name: 'Tier-1 Support Triage', description: 'Classify, retrieve KB, draft reply, parallel CRM+email after human escalation gate.',
    workspaceId: 'ws_acme', graph: supportGraph, version: 2, lastRunAt: '2026-06-11T22:03:00Z', avgCost: 0.47, successRate: 98.8,
  },
  {
    id: 'wf_content', name: 'Content Factory v3', description: 'Research → parallel writers (long, social, SEO) → brand gate → publish.',
    workspaceId: 'ws_stellar', graph: contentGraph, version: 3, lastRunAt: '2026-06-11T16:18:00Z', avgCost: 3.19, successRate: 91.4,
  },
  {
    id: 'wf_intel', name: 'Competitive Intel Daily', description: 'Scheduled scrape + dual-model A/B analysis for pricing/hiring signals.',
    workspaceId: 'ws_stellar', graph: intelGraph, version: 1, lastRunAt: '2026-06-11T08:00:00Z', avgCost: 2.94, successRate: 100,
  },
  {
    id: 'wf_devops', name: 'Incident & Bug Triage', description: 'Auto-classify incidents, search duplicates, propose patches or assign humans.',
    workspaceId: 'ws_personal', graph: triageGraph, version: 5, lastRunAt: '2026-06-10T11:55:00Z', avgCost: 1.61, successRate: 89.3,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 12 MARKETPLACE TEMPLATES (with full sample graphs for "start from template")
const templates: Template[] = [
  { id: 'tpl_research', name: 'Deep Research Swarm', category: 'Research', description: 'Production-grade multi-agent research with source diversity, human approval, and polished exports.', rating: 4.9, usageCount: 1243, sampleGraph: researchGraph, tags: ['grok-4.3', 'parallel', 'human-gate', 'export'], estimatedAvgCost: 6.82, author: 'Acme Labs' },
  { id: 'tpl_support', name: 'Tier-1 Customer Support', category: 'Support', description: 'Fast triage + empathetic draft. Human gate only on high-severity or VIP accounts.', rating: 4.8, usageCount: 872, sampleGraph: supportGraph, tags: ['grok-4.3', 'tool', 'human-gate'], estimatedAvgCost: 0.47, author: 'ForgeOps' },
  { id: 'tpl_content', name: 'Content Pipeline (Long + Social)', category: 'Content', description: 'Parallel writing for blog + threads + SEO in one flow. Brand voice gate included.', rating: 4.7, usageCount: 619, sampleGraph: contentGraph, tags: ['parallel', 'grok-4.3', 'publish'], estimatedAvgCost: 3.19, author: 'Stellar' },
  { id: 'tpl_intel', name: 'Competitive Intel Monitor', category: 'Analytics', description: 'Daily signal extraction using A/B model variants. Great for pricing and GTM teams.', rating: 4.9, usageCount: 341, sampleGraph: intelGraph, tags: ['scheduled', 'ab-test', 'grok-4.3'], estimatedAvgCost: 2.94, author: 'ForgeOps' },
  { id: 'tpl_devops', name: 'Incident Response Triage', category: 'DevOps', description: 'Classify severity, find duplicates, auto-suggest fixes or route to humans.', rating: 4.6, usageCount: 288, sampleGraph: triageGraph, tags: ['grok-4.3', 'tool', 'human-gate'], estimatedAvgCost: 1.61, author: 'Linear Labs' },
  { id: 'tpl_legal', name: 'Contract Risk Analyzer', category: 'Legal', description: 'Clause extraction, risk scoring, redline suggestions, and summary for legal review.', rating: 4.8, usageCount: 197, sampleGraph: { nodes: [mkNode('l1','start','Upload Contract',pos(80,90)), mkNode('l2','agent','Clause Extractor',pos(260,70),{model:DEFAULT_MODEL}), mkNode('l3','agent','Risk Scorer',pos(420,110),{model:DEFAULT_MODEL}), mkNode('l4','human-gate','Legal Review',pos(580,90)), mkNode('l5','end','Redline Report',pos(720,90))], edges: [mkEdge('le1','l1','l2'),mkEdge('le2','l2','l3'),mkEdge('le3','l3','l4'),mkEdge('le4','l4','l5')] }, tags: ['grok-4.3', 'human-gate'], estimatedAvgCost: 1.08, author: 'Notion AI' },
  { id: 'tpl_sales', name: 'Lead Qualification & Routing', category: 'Sales', description: 'Enrich inbound leads, score, draft personalized first email, route to correct AE.', rating: 4.5, usageCount: 504, sampleGraph: { nodes: [mkNode('sa1','start','New Lead',pos(60,100)), mkNode('sa2','tool','Enrich (Clearbit+)',pos(200,70),{tool:'enrich'}), mkNode('sa3','agent','ICP + Intent Scorer',pos(350,100),{model:DEFAULT_MODEL}), mkNode('sa4','human-gate','AE Handoff Approval',pos(510,100)), mkNode('sa5','tool','Notify AE + CRM',pos(670,70),{tool:'slack+hubspot'}), mkNode('sa6','end','Qualified',pos(820,100))], edges: [mkEdge('sae1','sa1','sa2'),mkEdge('sae2','sa2','sa3'),mkEdge('sae3','sa3','sa4'),mkEdge('sae4','sa4','sa5'),mkEdge('sae5','sa5','sa6')] }, tags: ['tool', 'grok-4.3'], estimatedAvgCost: 0.29, author: 'Vercel' },
  { id: 'tpl_knowledge', name: 'Internal Knowledge Base Bot', category: 'Operations', description: 'Answers employee questions from Notion + Slack history. Citations always included.', rating: 4.4, usageCount: 163, sampleGraph: { nodes: [mkNode('k1','start','Employee Question',pos(70,100)), mkNode('k2','tool','Vector Search',pos(210,80),{tool:'pinecone'}), mkNode('k3','agent','Answer + Citations',pos(370,100),{model:DEFAULT_MODEL}), mkNode('k4','end','Reply with Sources',pos(530,100))], edges: [mkEdge('ke1','k1','k2'),mkEdge('ke2','k2','k3'),mkEdge('ke3','k3','k4')] }, tags: ['grok-4.3', 'rag'], estimatedAvgCost: 0.18, author: 'Replicate' },
  { id: 'tpl_marketing', name: 'Campaign Brief to Assets', category: 'Marketing', description: 'Turns a one-liner into positioning, 5 creative concepts, copy variants, and image prompts.', rating: 4.7, usageCount: 412, sampleGraph: { nodes: [mkNode('m1','start','Campaign Idea',pos(60,110)), mkNode('m2','agent','Positioning + Angles',pos(200,80),{model:DEFAULT_MODEL}), mkNode('m3','parallel','Asset Factory',pos(380,110)), mkNode('m4','agent','Copy Variants',pos(530,50),{model:DEFAULT_MODEL}), mkNode('m5','agent','Visual Prompts',pos(530,160),{model:DEFAULT_MODEL}), mkNode('m6','end','Ready for Review',pos(680,110))], edges: [mkEdge('me1','m1','m2'),mkEdge('me2','m2','m3'),mkEdge('me3','m3','m4'),mkEdge('me4','m3','m5'),mkEdge('me5','m4','m6'),mkEdge('me6','m5','m6')] }, tags: ['parallel', 'creative'], estimatedAvgCost: 1.77, author: 'Acme Labs' },
  { id: 'tpl_security', name: 'Security Posture Scanner', category: 'Security', description: 'Scans repos + infra for misconfigs, suggests fixes with prioritized backlog.', rating: 4.9, usageCount: 89, sampleGraph: { nodes: [mkNode('se1','start','Repo + Cloud Target',pos(50,100)), mkNode('se2','tool','Scan (Semgrep + Trivy)',pos(190,70),{tool:'scanner'}), mkNode('se3','agent','Prioritize & Explain',pos(360,100),{model:DEFAULT_MODEL}), mkNode('se4','human-gate','Security Owner Sign-off',pos(510,100)), mkNode('se5','tool','Create Tickets',pos(660,70),{tool:'jira'}), mkNode('se6','end','Backlog Updated',pos(800,100))], edges: [mkEdge('see1','se1','se2'),mkEdge('see2','se2','se3'),mkEdge('see3','se3','se4'),mkEdge('see4','se4','se5'),mkEdge('see5','se5','se6')] }, tags: ['grok-4.3', 'tool', 'human-gate'], estimatedAvgCost: 2.35, author: 'ForgeOps' },
  { id: 'tpl_hr', name: 'Candidate Screening Assistant', category: 'HR', description: 'Resume screen + LinkedIn research + question generator + bias check before recruiter review.', rating: 4.3, usageCount: 156, sampleGraph: { nodes: [mkNode('h1','start','New Application',pos(70,100)), mkNode('h2','tool','Resume + Profile Parse',pos(210,70),{tool:'parse'}), mkNode('h3','agent','Fit Score + Questions',pos(370,100),{model:DEFAULT_MODEL}), mkNode('h4','human-gate','Recruiter Review',pos(530,100)), mkNode('h5','end','Interview Kit Ready',pos(690,100))], edges: [mkEdge('he1','h1','h2'),mkEdge('he2','h2','h3'),mkEdge('he3','h3','h4'),mkEdge('he4','h4','h5')] }, tags: ['grok-4.3', 'human-gate'], estimatedAvgCost: 0.34, author: 'Notion AI' },
  { id: 'tpl_analytics', name: 'Weekly Metrics Storyteller', category: 'Analytics', description: 'Pulls product + revenue metrics, finds anomalies, writes exec narrative + charts.', rating: 4.6, usageCount: 227, sampleGraph: { nodes: [mkNode('a1','start','Weekly Trigger',pos(60,100)), mkNode('a2','tool','Metrics Pull (Stripe + Mixpanel)',pos(200,70),{tool:'metrics'}), mkNode('a3','agent','Anomaly + Narrative',pos(360,100),{model:DEFAULT_MODEL}), mkNode('a4','end','Email + Slack Digest',pos(520,100))], edges: [mkEdge('ae1','a1','a2'),mkEdge('ae2','a2','a3'),mkEdge('ae3','a3','a4')] }, tags: ['grok-4.3', 'tool'], estimatedAvgCost: 0.81, author: 'Replicate' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 25+ EXECUTIONS (varied realistic history + 2 currently "running")
const baseLogs = (wfId: string, prefix: string): ExecutionLog[] => {
  // Deterministic log sequences per workflow archetype (trimmed for brevity in some)
  if (wfId === 'wf_research') return [
    { ts: `${prefix} 14:19:02`, nodeId: 'n_plan', message: 'grok-4.3 • Decomposed into 6 sub-questions + 3 source strategies', level: 'info', tokens: 1840, latencyMs: 920 },
    { ts: `${prefix} 14:19:04`, nodeId: 'n_par', message: 'Parallel branch spawned (3 researchers)', level: 'info' },
    { ts: `${prefix} 14:19:11`, nodeId: 'n_r2', message: 'Web scout: 47 pages fetched. Key signal on Series B pricing change.', level: 'info', costDelta: 0.31, tokens: 3120 },
    { ts: `${prefix} 14:19:19`, nodeId: 'n_r1', message: 'Academic: 4 arXiv + 2 Nature papers summarized.', level: 'info', costDelta: 0.94, tokens: 4810 },
    { ts: `${prefix} 14:19:27`, nodeId: 'n_r3', message: 'Competitor analysis complete on 3 players.', level: 'info', costDelta: 0.28, tokens: 2190 },
    { ts: `${prefix} 14:19:29`, nodeId: 'n_merge', message: 'Deduped 31 unique findings. Confidence 0.87', level: 'info' },
    { ts: `${prefix} 14:19:31`, nodeId: 'n_gate', message: 'Human gate: waiting for owner review (max 1h)', level: 'gate' },
  ];
  if (wfId === 'wf_support') return [
    { ts: `${prefix} 22:01:11`, nodeId: 's_class', message: 'grok-4.3 • VIP account + high urgency (billing dispute)', level: 'info', tokens: 420 },
    { ts: `${prefix} 22:01:13`, nodeId: 's_kb', message: 'Retrieved 3 relevant articles + last 2 tickets for this org.', level: 'info', latencyMs: 180 },
    { ts: `${prefix} 22:01:15`, nodeId: 's_gate', message: 'Auto-approved (standard policy). Escalated only if >$5k or churn risk.', level: 'gate' },
    { ts: `${prefix} 22:01:16`, nodeId: 's_reply', message: 'Draft ready. Tone: empathetic + firm. Suggested credit + follow-up call.', level: 'info', costDelta: 0.08, tokens: 910 },
  ];
  return [
    { ts: `${prefix} 09:14:03`, nodeId: 'c_research', message: 'grok-4.3 • 5 fresh angles surfaced from earnings calls + Reddit', level: 'info', costDelta: 0.41, tokens: 2740 },
    { ts: `${prefix} 09:14:09`, nodeId: 'c_par', message: '3 parallel writers started', level: 'info' },
    { ts: `${prefix} 09:14:41`, nodeId: 'c_w1', message: 'Long-form draft 2184 words. Readability 82.', level: 'info', costDelta: 0.93 },
    { ts: `${prefix} 09:14:44`, nodeId: 'c_merge', message: 'Merged. Minor duplication resolved.', level: 'info' },
    { ts: `${prefix} 09:14:46`, nodeId: 'c_gate', message: 'Gate passed in 41s by brand lead', level: 'gate' },
  ];
};

const executions: Execution[] = [
  // Recent + varied
  { id: 'exec_4821', workflowId: 'wf_research', workspaceId: 'ws_acme', status: 'running', startedAt: '2026-06-11T19:41:00Z', durationMs: 174000, totalCost: 4.12, tokens: 28400, logs: [...baseLogs('wf_research', '2026-06-11'), { ts: '2026-06-11 19:43:12', nodeId: 'n_synth', message: 'Synthesis 63% complete...', level: 'info', costDelta: 1.12 }], trace: ['Plan→Parallel→Merge→Gate→Synth'], triggeredBy: 'maya@acme.ai' },
  { id: 'exec_4819', workflowId: 'wf_support', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-11T22:01:09Z', endedAt: '2026-06-11T22:01:29Z', durationMs: 19800, totalCost: 0.39, tokens: 3120, logs: baseLogs('wf_support', '2026-06-11'), trace: ['Classify→KB→Gate→Reply→Parallel→CRM'], triggeredBy: 'liam@acme.ai' },
  { id: 'exec_4817', workflowId: 'wf_research', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-11T14:22:00Z', endedAt: '2026-06-11T14:29:41Z', durationMs: 461000, totalCost: 7.82, tokens: 52300, logs: [...baseLogs('wf_research', '2026-06-11'), { ts: '2026-06-11 14:24:51', nodeId: 'n_synth', message: 'Full report generated. 9 citations.', level: 'info', costDelta: 1.98 }, { ts: '2026-06-11 14:25:04', nodeId: 'n_export', message: 'PDF + Notion page created. URL: https://notion.so/acme/r-4820', level: 'info', costDelta: 0.04 }], trace: ['Plan→Parallel(3)→Merge→Gate(18m)→Synth→Export'], triggeredBy: 'maya@acme.ai' },
  { id: 'exec_4815', workflowId: 'wf_content', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-11T16:12:00Z', endedAt: '2026-06-11T16:19:03Z', durationMs: 423000, totalCost: 3.41, tokens: 18900, logs: baseLogs('wf_content', '2026-06-11'), trace: ['Brief→Research→Writers(3)→Gate→Polish→Publish'], triggeredBy: 'sara@stellar.io' },
  { id: 'exec_4813', workflowId: 'wf_intel', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-11T08:00:00Z', endedAt: '2026-06-11T08:02:14Z', durationMs: 134000, totalCost: 2.71, tokens: 14400, logs: [
    { ts: '2026-06-11 08:00:02', nodeId: 'i_fetch', message: '8 sources scraped successfully (latency 812ms avg)', level: 'info' },
    { ts: '2026-06-11 08:00:09', nodeId: 'i_anal', message: 'grok-4.3 detected 2 high-signal events: competitor price drop + new VP Eng hire', level: 'info', costDelta: 0.67 },
    { ts: '2026-06-11 08:00:44', nodeId: 'i_a', message: 'Variant A (heavy): full narrative + 4 risk scenarios', level: 'info', costDelta: 1.12 },
    { ts: '2026-06-11 08:01:51', nodeId: 'i_b', message: 'Variant B (fast): 9 bullets + links', level: 'info', costDelta: 0.31 },
  ], trace: ['Fetch→Detect→A/B(dual)→Digest'], triggeredBy: 'ops@stellar.io' },
  { id: 'exec_4811', workflowId: 'wf_devops', workspaceId: 'ws_personal', status: 'failed', startedAt: '2026-06-10T11:48:00Z', endedAt: '2026-06-10T11:49:12Z', durationMs: 72000, totalCost: 0.84, tokens: 6100, logs: [
    { ts: '2026-06-10 11:48:03', nodeId: 't_class', message: 'grok-4.3 classified as P1 production outage (auth regression)', level: 'warn' },
    { ts: '2026-06-10 11:48:11', nodeId: 't_search', message: 'Found 2 similar open incidents', level: 'info' },
    { ts: '2026-06-10 11:48:19', nodeId: 't_code', message: 'Patch proposal generated. 3 files touched.', level: 'info', costDelta: 0.61 },
    { ts: '2026-06-10 11:49:04', nodeId: 't_owner', message: 'Gate timeout after 45s — auto-assigned to oncall@', level: 'error' },
    { ts: '2026-06-10 11:49:12', nodeId: 't_notify', message: 'ERROR: Slack rate limit. Manual follow-up required.', level: 'error' },
  ], trace: ['Classify→Search→Patch→Gate(timeout)→Fail'], triggeredBy: 'you@personal.dev' },
  // More historical (varied cost, status, dates)
  { id: 'exec_4808', workflowId: 'wf_research', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-09T10:05:00Z', endedAt: '2026-06-09T10:11:47Z', durationMs: 407000, totalCost: 5.91, tokens: 39800, logs: [...baseLogs('wf_research', '2026-06-09'), { ts: '2026-06-09 10:08:12', nodeId: 'n_gate', message: 'Approved by maya@acme.ai after 2m review', level: 'gate' }, { ts: '2026-06-09 10:09:44', nodeId: 'n_synth', message: 'Synthesis complete. 11 sources. Cost so far $5.87', level: 'cost', costDelta: 1.87 }], trace: ['Plan→Parallel→Gate(2m)→Synth→Export'], triggeredBy: 'maya@acme.ai' },
  { id: 'exec_4805', workflowId: 'wf_support', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-10T09:33:00Z', endedAt: '2026-06-10T09:33:51Z', durationMs: 51000, totalCost: 0.22, tokens: 1870, logs: baseLogs('wf_support', '2026-06-10'), trace: ['Triage→Resolved'], triggeredBy: 'support-bot@acme.ai' },
  { id: 'exec_4803', workflowId: 'wf_content', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-08T13:40:00Z', endedAt: '2026-06-08T13:47:19Z', durationMs: 439000, totalCost: 2.98, tokens: 16700, logs: baseLogs('wf_content', '2026-06-08'), trace: ['Full pipeline'], triggeredBy: 'sara@stellar.io' },
  { id: 'exec_4801', workflowId: 'wf_intel', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-10T08:00:00Z', endedAt: '2026-06-10T08:02:31Z', durationMs: 151000, totalCost: 3.12, tokens: 15900, logs: [
    { ts: '2026-06-10 08:00:04', nodeId: 'i_anal', message: 'grok-4.3: 1 pricing signal + 1 funding rumor', level: 'info', costDelta: 0.79 },
    { ts: '2026-06-10 08:01:12', nodeId: 'i_a', message: 'Variant A delivered full 5-paragraph brief', level: 'info', costDelta: 1.08 },
  ], trace: ['A/B Intel'], triggeredBy: 'ops@stellar.io' },
  { id: 'exec_4799', workflowId: 'wf_devops', workspaceId: 'ws_personal', status: 'succeeded', startedAt: '2026-06-07T22:14:00Z', endedAt: '2026-06-07T22:15:33Z', durationMs: 93000, totalCost: 1.29, tokens: 8200, logs: [
    { ts: '2026-06-07 22:14:09', nodeId: 't_code', message: 'Suggested fix for auth middleware race', level: 'info', costDelta: 0.71 },
    { ts: '2026-06-07 22:14:28', nodeId: 't_owner', message: 'Assigned to you@personal.dev (accepted)', level: 'gate' },
  ], trace: ['Triage→Patch→Assigned'], triggeredBy: 'you@personal.dev' },
  { id: 'exec_4796', workflowId: 'wf_research', workspaceId: 'ws_acme', status: 'paused', startedAt: '2026-06-06T16:55:00Z', durationMs: 289000, totalCost: 2.14, tokens: 17100, logs: [...baseLogs('wf_research', '2026-06-06'), { ts: '2026-06-06 16:57:41', nodeId: 'n_gate', message: 'Paused by user (budget review)', level: 'warn' }], trace: ['Paused at gate'], triggeredBy: 'finance@acme.ai' },
  // 13 more to hit 20+
  { id: 'exec_4794', workflowId: 'wf_support', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-11T15:22:00Z', endedAt: '2026-06-11T15:22:47Z', durationMs: 47000, totalCost: 0.18, tokens: 1410, logs: baseLogs('wf_support', '2026-06-11'), trace: ['Fast resolve'], triggeredBy: 'liam@acme.ai' },
  { id: 'exec_4792', workflowId: 'wf_content', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-05T11:02:00Z', endedAt: '2026-06-05T11:09:11Z', durationMs: 431000, totalCost: 3.77, tokens: 20400, logs: baseLogs('wf_content', '2026-06-05'), trace: ['Pipeline'], triggeredBy: 'sara@stellar.io' },
  { id: 'exec_4790', workflowId: 'wf_intel', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-09T08:00:00Z', endedAt: '2026-06-09T08:02:08Z', durationMs: 128000, totalCost: 2.63, tokens: 13800, logs: [{ ts: '2026-06-09 08:00:05', nodeId: 'i_b', message: 'Variant B chosen for speed in this run', level: 'info', costDelta: 0.29 }], trace: ['Intel'], triggeredBy: 'ops@stellar.io' },
  { id: 'exec_4788', workflowId: 'wf_devops', workspaceId: 'ws_personal', status: 'succeeded', startedAt: '2026-06-04T09:51:00Z', endedAt: '2026-06-04T09:52:44Z', durationMs: 104000, totalCost: 1.04, tokens: 5900, logs: [{ ts: '2026-06-04 09:51:22', nodeId: 't_code', message: 'Patch + unit test generated. Owner notified.', level: 'info', costDelta: 0.58 }], trace: ['DevOps'], triggeredBy: 'you@personal.dev' },
  { id: 'exec_4786', workflowId: 'wf_research', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-03T08:40:00Z', endedAt: '2026-06-03T08:46:12Z', durationMs: 372000, totalCost: 6.14, tokens: 41100, logs: [...baseLogs('wf_research', '2026-06-03'), { ts: '2026-06-03 08:43:55', nodeId: 'n_gate', message: 'Approved', level: 'gate' }], trace: ['Research run'], triggeredBy: 'maya@acme.ai' },
  { id: 'exec_4784', workflowId: 'wf_support', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-02T17:05:00Z', endedAt: '2026-06-02T17:05:39Z', durationMs: 39000, totalCost: 0.31, tokens: 2100, logs: baseLogs('wf_support', '2026-06-02'), trace: ['Support'], triggeredBy: 'liam@acme.ai' },
  { id: 'exec_4782', workflowId: 'wf_content', workspaceId: 'ws_stellar', status: 'failed', startedAt: '2026-06-01T14:18:00Z', endedAt: '2026-06-01T14:19:55Z', durationMs: 117000, totalCost: 1.82, tokens: 9900, logs: [{ ts: '2026-06-01 14:18:21', nodeId: 'c_w1', message: 'Writer hit context limit. Retry strategy exhausted.', level: 'error' }], trace: ['Failed at writer'], triggeredBy: 'sara@stellar.io' },
  { id: 'exec_4780', workflowId: 'wf_intel', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-07T08:00:00Z', endedAt: '2026-06-07T08:02:19Z', durationMs: 139000, totalCost: 2.88, tokens: 15100, logs: [{ ts: '2026-06-07 08:01:03', nodeId: 'i_a', message: 'grok-4.3 variant surfaced 3 actionable moves', level: 'info', costDelta: 1.03 }], trace: ['Intel'], triggeredBy: 'ops@stellar.io' },
  { id: 'exec_4778', workflowId: 'wf_devops', workspaceId: 'ws_personal', status: 'succeeded', startedAt: '2026-06-06T07:12:00Z', endedAt: '2026-06-06T07:13:27Z', durationMs: 87000, totalCost: 1.55, tokens: 7400, logs: [{ ts: '2026-06-06 07:12:41', nodeId: 't_owner', message: 'Human assigned. Patch already applied in staging.', level: 'gate' }], trace: ['DevOps'], triggeredBy: 'you@personal.dev' },
  { id: 'exec_4776', workflowId: 'wf_research', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-02T13:11:00Z', endedAt: '2026-06-02T13:18:04Z', durationMs: 423000, totalCost: 8.12, tokens: 54900, logs: [...baseLogs('wf_research', '2026-06-02'), { ts: '2026-06-02 13:15:33', nodeId: 'n_synth', message: 'Report ready. High confidence.', level: 'info', costDelta: 2.03 }], trace: ['Long research'], triggeredBy: 'maya@acme.ai' },
  { id: 'exec_4774', workflowId: 'wf_support', workspaceId: 'ws_acme', status: 'succeeded', startedAt: '2026-06-11T11:44:00Z', endedAt: '2026-06-11T11:44:58Z', durationMs: 58000, totalCost: 0.51, tokens: 2900, logs: baseLogs('wf_support', '2026-06-11'), trace: ['Support'], triggeredBy: 'liam@acme.ai' },
  { id: 'exec_4772', workflowId: 'wf_content', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-04T09:55:00Z', endedAt: '2026-06-04T10:02:14Z', durationMs: 439000, totalCost: 3.03, tokens: 17200, logs: baseLogs('wf_content', '2026-06-04'), trace: ['Content'], triggeredBy: 'sara@stellar.io' },
  { id: 'exec_4770', workflowId: 'wf_intel', workspaceId: 'ws_stellar', status: 'succeeded', startedAt: '2026-06-06T08:00:00Z', endedAt: '2026-06-06T08:02:22Z', durationMs: 142000, totalCost: 2.77, tokens: 14600, logs: [{ ts: '2026-06-06 08:00:55', nodeId: 'i_b', message: 'Fast path chosen. Digest emailed.', level: 'info', costDelta: 0.27 }], trace: ['Intel'], triggeredBy: 'ops@stellar.io' },
  { id: 'exec_4768', workflowId: 'wf_devops', workspaceId: 'ws_personal', status: 'succeeded', startedAt: '2026-06-03T18:29:00Z', endedAt: '2026-06-03T18:30:41Z', durationMs: 101000, totalCost: 1.73, tokens: 8800, logs: [{ ts: '2026-06-03 18:30:02', nodeId: 't_code', message: 'Auto-fix for memory leak in prod worker', level: 'info', costDelta: 0.84 }], trace: ['DevOps'], triggeredBy: 'you@personal.dev' },
  // One more running for live multi-run feel
  { id: 'exec_4766', workflowId: 'wf_intel', workspaceId: 'ws_stellar', status: 'running', startedAt: '2026-06-11T23:55:00Z', durationMs: 67000, totalCost: 1.29, tokens: 7800, logs: [
    { ts: '2026-06-11 23:55:03', nodeId: 'i_fetch', message: 'Daily scrape started (8 targets)', level: 'info' },
    { ts: '2026-06-11 23:55:19', nodeId: 'i_anal', message: 'grok-4.3: 1 pricing move detected on competitor X', level: 'info', costDelta: 0.61 },
  ], trace: ['Running intel'], triggeredBy: 'ops@stellar.io' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEAM / RBAC (personas)
const team: TeamMember[] = [
  { id: 'u_maya', name: 'Maya Chen', email: 'maya@acme.ai', role: 'owner', workspaceId: 'ws_acme' },
  { id: 'u_liam', name: 'Liam Park', email: 'liam@acme.ai', role: 'admin', workspaceId: 'ws_acme' },
  { id: 'u_zoe', name: 'Zoe Ramirez', email: 'zoe@acme.ai', role: 'editor', workspaceId: 'ws_acme' },
  { id: 'u_jules', name: 'Jules Kim', email: 'jules@acme.ai', role: 'viewer', workspaceId: 'ws_acme' },
  { id: 'u_sara', name: 'Sara Patel', email: 'sara@stellar.io', role: 'owner', workspaceId: 'ws_stellar' },
  { id: 'u_ops', name: 'Ops Bot', email: 'ops@stellar.io', role: 'editor', workspaceId: 'ws_stellar' },
  { id: 'u_you', name: 'You', email: 'you@personal.dev', role: 'owner', workspaceId: 'ws_personal' },
  { id: 'u_guest', name: 'Guest Analyst', email: 'analyst@demo.co', role: 'viewer', workspaceId: 'ws_personal' },
];

// ─────────────────────────────────────────────────────────────────────────────
// A/B EXPERIMENTS (simulation + monitoring feature)
const experiments: ABExperiment[] = [
  {
    id: 'ab_intel_01', name: 'Intel Daily: Grok-4.3 Heavy vs Fast Grok-4.3', workflowId: 'wf_intel',
    variantA: { name: 'Heavy (Grok-4.3)', model: DEFAULT_MODEL, config: { depth: 'full-narrative', maxTokens: 3800 } },
    variantB: { name: 'Fast (Grok-4.3)', model: DEFAULT_MODEL, config: { depth: 'bullets', maxTokens: 1200 } },
    runsA: 41, runsB: 39, successA: 97.6, successB: 92.3, costA: 2.81, costB: 0.94,
    winner: 'A', status: 'completed',
  },
  {
    id: 'ab_content_02', name: 'Content Factory: Grok-4.3 Premium vs Standard for Long-form', workflowId: 'wf_content',
    variantA: { name: 'Grok-4.3 Writer', model: DEFAULT_MODEL, config: { style: 'premium' } },
    variantB: { name: 'Grok-4.3 Standard', model: DEFAULT_MODEL, config: { style: 'standard' } },
    runsA: 28, runsB: 31, successA: 94.1, successB: 87.1, costA: 3.84, costB: 1.61,
    winner: 'A', status: 'completed',
  },
  {
    id: 'ab_research_live', name: 'Research Swarm: Parallel Breadth vs Depth', workflowId: 'wf_research',
    variantA: { name: 'Breadth (more agents)', model: DEFAULT_MODEL, config: { branches: 5 } },
    variantB: { name: 'Depth (fewer, deeper)', model: DEFAULT_MODEL, config: { branches: 2 } },
    runsA: 9, runsB: 7, successA: 88.9, successB: 100, costA: 8.14, costB: 4.71,
    status: 'running',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// USAGE / BILLING SNAPSHOT (tiers exercised)
const usage: UsageSnapshot = {
  period: 'June 2026',
  totalSpend: 260.34,
  executions: 312,
  tokens: 1420000,
  avgCostPerExec: 0.83,
  successRate: 94.2,
  byTierBreakdown: { team: 187.43, pro: 64.12, free: 8.79 },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED SEED (immutable base). Consumers deep-clone for live mutations.
export const DEMO_SEED: DemoSeed = {
  workspaces,
  workflows,
  executions,
  templates,
  team,
  experiments,
  usage,
};

// Utility: find helpers (pure)
export function getWorkflowById(seed: DemoSeed, id: string) {
  return seed.workflows.find(w => w.id === id);
}
export function getExecutionsForWorkflow(seed: DemoSeed, wfId: string) {
  return seed.executions.filter(e => e.workflowId === wfId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export function getTemplateById(seed: DemoSeed, id: string) {
  return seed.templates.find(t => t.id === id);
}
export function getWorkspaceById(seed: DemoSeed, id: string) {
  return seed.workspaces.find(w => w.id === id);
}
export function getTeamForWorkspace(seed: DemoSeed, wsId: string) {
  return seed.team.filter(t => t.workspaceId === wsId);
}

// Deep clone helper for safe client mutations (structuredClone when available)
export function cloneSeed(seed: DemoSeed): DemoSeed {
  return JSON.parse(JSON.stringify(seed)) as DemoSeed;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHETIC DATASETS (for Simulation Arena — seeded, deterministic)
export interface SyntheticDataset {
  id: string;
  name: string;
  description: string;
  size: number; // scale indicator (rows/tokens/items)
  domain: string; // research | support | intel | devops | content | etc.
}

const syntheticDatasets: SyntheticDataset[] = [
  { id: 'ds_papers', name: 'arXiv + Nature 2024-25', description: '12k academic papers with citations', size: 12000, domain: 'research' },
  { id: 'ds_tickets', name: 'Support tickets Q2', description: '8.4k tickets with full threads', size: 8400, domain: 'support' },
  { id: 'ds_web', name: 'Web crawl (top 50 domains)', description: 'Fresh crawl, ~2.1M tokens', size: 2100000, domain: 'intel' },
  { id: 'ds_code', name: 'Repo snapshot (main + 3 services)', description: 'TypeScript + Python + tests', size: 480000, domain: 'devops' },
  { id: 'ds_content', name: 'Brand corpus + past posts', description: '2.3k approved pieces', size: 2300, domain: 'content' },
  { id: 'ds_contracts', name: 'Contract archive (MSA + NDAs)', description: '940 docs, 12 jurisdictions', size: 940, domain: 'legal' },
  { id: 'ds_leads', name: 'Inbound leads (CRM export)', description: '3.1k enriched leads', size: 3100, domain: 'sales' },
  { id: 'ds_kb', name: 'Internal KB + Slack history', description: '18k chunks, citations ready', size: 18000, domain: 'operations' },
];

export function getSyntheticDatasets(): SyntheticDataset[] { return syntheticDatasets; }
export function getDatasetById(id: string): SyntheticDataset | undefined { return syntheticDatasets.find(d => d.id === id); }

// Realistic log generator using the actual graph structure (deterministic given step)
export function generateGraphAwareLog(
  graph: WorkflowGraph,
  step: number,
  previousNodeId?: string
): ExecutionLog {
  const nodes = graph?.nodes || [];
  if (nodes.length === 0) {
    return { ts: new Date().toISOString().slice(11,19), nodeId: 'sys', message: 'No graph', level: 'info' };
  }
  // Walk edges if possible to feel realistic
  let node = nodes[0];
  if (previousNodeId) {
    const outgoing = (graph.edges || []).filter(e => e.source === previousNodeId);
    if (outgoing.length > 0) {
      const targetId = outgoing[step % outgoing.length].target;
      const found = nodes.find(n => n.id === targetId);
      if (found) node = found;
    } else {
      node = nodes[(nodes.findIndex(n => n.id === previousNodeId) + 1) % nodes.length];
    }
  } else {
    node = nodes[step % nodes.length];
  }
  const baseCost = node.estimatedCost ?? (0.08 + ((step % 7) * 0.11));
  const costDelta = +(baseCost * (0.7 + ((step % 5) * 0.08))).toFixed(2);
  const latency = 420 + ((step % 9) * 110) + (node.type === 'tool' ? 180 : 0);
  const tokens = 140 + ((step % 6) * 210) + (node.model?.includes('4') ? 600 : 0);

  let message = '';
  if (node.type === 'start') message = 'Flow started';
  else if (node.type === 'end') message = 'Flow complete';
  else if (node.type === 'agent') message = `${node.model || 'agent'} • ${node.prompt?.slice(0, 64) || 'processing'}...`;
  else if (node.type === 'tool') message = `Tool: ${node.tool || 'external'} (ok)`;
  else if (node.type === 'human-gate') message = 'Human gate: awaiting decision';
  else if (node.type === 'parallel') message = `Parallel spawn: ${Math.max(2, (graph.edges || []).filter(e => e.source === node.id).length || 3)} branches`;
  else if (node.type === 'merge') message = 'Merge + dedup complete';
  else message = `${node.label || node.type} step ${step + 1}`;

  return {
    ts: new Date(Date.now() - (12 - (step % 12)) * 3100).toISOString().slice(11,19),
    nodeId: node.id,
    message,
    level: node.type === 'human-gate' ? 'gate' : (node.type === 'tool' ? 'info' : 'info'),
    costDelta: node.type === 'end' ? undefined : costDelta,
    tokens: node.type === 'end' ? undefined : tokens,
    latencyMs: latency,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers (pure functions for Vitest coverage of clone, get*, graph, costs, RBAC gating)
// Authorized for test helpers only per F-0019 brief. No core data changes.
export function canIntervene(role: TeamMember['role']): boolean {
  // owner, admin, editor can trigger/intervene runs; viewer cannot
  return role === 'owner' || role === 'admin' || role === 'editor';
}

/**
 * F-0021: unified canEdit predicate — viewer is strictly read-only.
 * owner/admin/editor can mutate graph nodes, edges, and properties.
 * Used by demo canvas to gate every mutation control.
 */
export function canEdit(role: TeamMember['role']): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

export function computeGraphCost(graph: WorkflowGraph): number {
  return (graph.nodes || []).reduce((sum, n) => sum + (n.estimatedCost || 0), 0);
}

export function getNodeCount(graph: WorkflowGraph): number {
  return (graph.nodes || []).length;
}

export function getEdgeCount(graph: WorkflowGraph): number {
  return (graph.edges || []).length;
}

// === F-0018 additive helpers (prompt-to-graph, seed graph loader, node/edge creators) ===
// Only additive; no changes to existing data or behavior.

export function createGraphNode(id: string, type: NodeType, label: string, position: { x: number; y: number }, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, type, label, position, ...extra };
}

export function createGraphEdge(id: string, source: string, target: string, label?: string): GraphEdge {
  return { id, source, target, label };
}

export function getSeedGraphs(): Array<{ id: string; name: string; graph: WorkflowGraph }> {
  // Deep clone so callers can mutate safely
  return [
    { id: 'research', name: 'Deep Research & Synthesis Swarm', graph: JSON.parse(JSON.stringify(researchGraph)) },
    { id: 'support', name: 'Tier-1 Support Triage', graph: JSON.parse(JSON.stringify(supportGraph)) },
    { id: 'content', name: 'Content Factory v3', graph: JSON.parse(JSON.stringify(contentGraph)) },
    { id: 'intel', name: 'Competitive Intel Daily', graph: JSON.parse(JSON.stringify(intelGraph)) },
    { id: 'devops', name: 'Incident & Bug Triage', graph: JSON.parse(JSON.stringify(triageGraph)) },
  ];
}

export function promptToGraph(prompt: string, baseX = 120, baseY = 180): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const p = (prompt || '').toLowerCase().trim();
  const ts = Date.now().toString(36).slice(-6);
  const n = (s: string) => `${s}_${ts}`;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // High-quality heuristics drawing from real seed examples (no external calls)
  if (p.includes('gate') || p.includes('review') || p.includes('approve') || p.includes('human') || p.includes('sign-off') || p.includes('signoff')) {
    nodes.push(createGraphNode(n('gate'), 'human-gate', 'Human Review Gate', { x: baseX + 180, y: baseY }, { timeoutSec: 3600 }));
  } else if (p.includes('parallel') || p.includes('swarm') || p.includes('multiple') || p.includes('branches') || p.includes('concurrent')) {
    const par = n('par');
    nodes.push(createGraphNode(par, 'parallel', 'Parallel Branch', { x: baseX + 140, y: baseY }));
    nodes.push(createGraphNode(n('a1'), 'agent', 'Branch A (Grok-4.3)', { x: baseX + 320, y: baseY - 70 }, { model: DEFAULT_MODEL, prompt: 'Deep subtask A from prompt', estimatedCost: 0.81 }));
    nodes.push(createGraphNode(n('a2'), 'agent', 'Branch B (Grok-4.3)', { x: baseX + 320, y: baseY + 70 }, { model: DEFAULT_MODEL, prompt: 'Fast subtask B from prompt', estimatedCost: 0.29 }));
    nodes.push(createGraphNode(n('m'), 'merge', 'Merge Results', { x: baseX + 480, y: baseY }));
    edges.push(createGraphEdge(n('e1'), par, n('a1')));
    edges.push(createGraphEdge(n('e2'), par, n('a2')));
    edges.push(createGraphEdge(n('e3'), n('a1'), n('m')));
    edges.push(createGraphEdge(n('e4'), n('a2'), n('m')));
  } else if (p.includes('tool') || p.includes('search') || p.includes('scrape') || p.includes('export') || p.includes('lookup') || p.includes('send') || p.includes('kb') || p.includes('vector')) {
    const tool = p.includes('search') ? 'web.search + vector' : p.includes('scrape') ? 'firecrawl.batch' : p.includes('export') ? 'notion.export + pdf' : p.includes('kb') || p.includes('vector') ? 'kb.search + pinecone' : 'external.api';
    nodes.push(createGraphNode(n('tool'), 'tool', 'Tool: ' + tool.split(' ')[0], { x: baseX + 160, y: baseY }, { tool, estimatedCost: 0.14 }));
  } else {
    // default: high-quality agent node, realistic prompt + cost + model choice
    const isDeep = p.includes('deep') || p.includes('research') || p.includes('analyze') || p.includes('synthes') || p.includes('report') || prompt.length > 55;
    const model = DEFAULT_MODEL;
    const cost = isDeep ? 1.42 : 0.47;
    const refined = prompt.length > 8 ? prompt : 'Process input with high accuracy and cite sources';
    nodes.push(createGraphNode(n('agent'), 'agent', prompt.slice(0, 28) || 'New Agent', { x: baseX + 160, y: baseY }, {
      model,
      prompt: refined,
      estimatedCost: cost,
    }));
  }

  // Prepend a start for new flows when it makes sense (demo friendliness)
  if ((p.includes('start') || p.includes('from') || p.includes('begin') || nodes.length <= 2) && nodes.length > 0) {
    const startId = n('start');
    nodes.unshift(createGraphNode(startId, 'start', 'Start', { x: baseX, y: baseY }));
    if (nodes.length > 1) {
      edges.unshift(createGraphEdge(n('e0'), startId, nodes[1].id));
    }
  }

  return { nodes, edges };
}
