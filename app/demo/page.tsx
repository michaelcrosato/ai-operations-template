'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Square, Users, BarChart3, Settings, 
  Zap, ArrowLeft, MoreHorizontal, Download, RefreshCw, Command,
  Activity, TrendingUp, Target, Layers, Filter, Search, Star, Clock,
  CheckCircle, XCircle, AlertCircle, Eye, Copy, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DEMO_SEED, cloneSeed, getWorkflowById, getExecutionsForWorkflow, getTemplateById, getSyntheticDatasets, generateGraphAwareLog, getTeamForWorkspace, promptToGraph, getSeedGraphs, canIntervene as userCanIntervene, canEdit as userCanEdit, computeGraphCost, getNodeCount, getEdgeCount, type DemoSeed, type WorkflowGraph, type Execution, type Template, type SyntheticDataset, type NodeType } from '@/lib/seed';
import { DEFAULT_MODEL, MODEL_OPTIONS } from '@/lib/models';

// @xyflow/react — full interactive canvas (already in deps per brief)
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { Node, Edge, NodeTypes, NodeProps } from '@xyflow/react';
// @ts-ignore
import '@xyflow/react/dist/style.css';

// Reusable graph visualizer (enhanced with highlight support)
function GraphViz({ 
  graph, 
  runningNodeIds = [], 
  highlightedNodeId,
  onNodeClick 
}: { 
  graph: WorkflowGraph; 
  runningNodeIds?: string[]; 
  highlightedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
}) {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/70">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {edges.map((e: any, i: number) => {
          const from = nodes.find(n => n.id === (e.source || e.from));
          const to = nodes.find(n => n.id === (e.target || e.to));
          if (!from || !to) return null;
          return (
            <line 
              key={i}
              x1={from.position?.x || 0} y1={(from.position?.y || 0) + 18}
              x2={to.position?.x || 0} y2={(to.position?.y || 0) + 18}
              stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" 
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const isRunning = runningNodeIds.includes(node.id);
        const isHighlight = highlightedNodeId === node.id;
        const pos = node.position || { x: 80, y: 80 };
        return (
          <motion.div
            key={node.id}
            className={`canvas-node absolute px-3 py-1.5 rounded-2xl border text-sm cursor-pointer select-none
              ${isHighlight ? 'bg-white/15 border-white/70 ring-1 ring-white/40' : ''}
              ${isRunning && !isHighlight ? 'bg-emerald-500/10 border-emerald-400/60 ring-1 ring-emerald-400/30' : ''}
              ${!isRunning && !isHighlight ? 'bg-white/5 border-white/15 hover:border-white/40' : ''}`}
            style={{ left: pos.x, top: pos.y, minWidth: 132 }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onNodeClick?.(node.id)}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          >
            <div className="font-medium flex items-center gap-2 text-[13px]">
              {node.label || node.type}
              {node.model && <span className="text-[9px] px-1 py-px rounded bg-white/10">{node.model}</span>}
            </div>
            {isRunning && <div className="text-[9px] text-emerald-400 mt-0.5">RUNNING</div>}
            {node.type === 'human-gate' && <div className="text-amber-400 text-[9px]">gate</div>}
          </motion.div>
        );
      })}

      <div className="absolute bottom-2 left-2 text-[9px] text-white/30 pointer-events-none">Seed graph • click nodes</div>
    </div>
  );
}

// F-0018: Full interactive @xyflow/react canvas (replaces stub GraphViz for main ops view only)
// Read-only previews in modals continue to use the lightweight SVG GraphViz.
function InteractiveCanvas({
  graph,
  onChange,
  runningNodeIds = [],
  highlightedNodeId,
  onNodeClick,
  selectedNodeId,
  onSelectedNodeChange,
}: {
  graph: WorkflowGraph;
  onChange: (g: WorkflowGraph) => void;
  runningNodeIds?: string[];
  highlightedNodeId?: string | null;
  onNodeClick?: (id: string) => void;
  selectedNodeId?: string | null;
  onSelectedNodeChange?: (id: string | null) => void;
}) {
  // local fallback if parent doesn't lift selection (for self-contained use)
  const [localSel, setLocalSel] = React.useState<string | null>(null);
  const selId = selectedNodeId !== undefined ? selectedNodeId : localSel;
  const setSel = (id: string | null) => {
    if (onSelectedNodeChange) onSelectedNodeChange(id);
    else setLocalSel(id);
  };

  // Would this edge create a cycle? (simple DFS; used to enforce "no cycles for some" rule)
  function wouldCreateCycle(g: WorkflowGraph, source: string, target: string): boolean {
    const adj: Record<string, string[]> = {};
    (g.nodes || []).forEach(nn => { adj[nn.id] = []; });
    (g.edges || []).forEach(e => { if (adj[e.source]) adj[e.source].push(e.target); });
    if (adj[source]) adj[source].push(target);
    const seen = new Set<string>();
    const dfs = (u: string): boolean => {
      if (u === source) return true;
      if (seen.has(u)) return false;
      seen.add(u);
      for (const v of (adj[u] || [])) {
        if (dfs(v)) return true;
      }
      return false;
    };
    return dfs(target);
  }

  // Map seed graph -> RF nodes (controlled, live highlights + selection)
  const rfNodes: Node[] = React.useMemo(() => {
    const ns = (graph?.nodes || []);
    if (!Array.isArray(ns)) return [];
    return ns.map((gn: any) => {
      const isRun = runningNodeIds.includes(gn.id);
      const isHi = highlightedNodeId === gn.id;
      const isSel = selId === gn.id;
      return {
        id: gn.id,
        type: gn.type || 'agent',
        position: gn.position || { x: 140, y: 120 },
        data: {
          label: gn.label,
          model: gn.model,
          prompt: gn.prompt,
          estimatedCost: gn.estimatedCost,
          tool: gn.tool,
          isRunning: isRun,
          isHighlight: isHi,
        },
        className: `canvas-node ${isRun ? 'running' : ''} ${isHi ? 'highlight' : ''} ${isSel ? 'selected' : ''}`,
        selected: isSel,
      };
    });
  }, [graph?.nodes, runningNodeIds, highlightedNodeId, selId]);

  const rfEdges: Edge[] = React.useMemo(() => {
    const es = (graph?.edges || []);
    return es.map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      animated: runningNodeIds.includes(e.source) || runningNodeIds.includes(e.target),
    }));
  }, [graph?.edges, runningNodeIds]);

  // Stable custom node renderer (rich labels, costs, running badges, a11y)
  // Defined inside so it closes over lucide icons already imported in parent scope
  const CustomNode = React.useCallback(({ id, data, type, selected }: NodeProps) => {
    const d = (data || {}) as any;
    const label = d.label || id;
    const model = d.model;
    const prompt = d.prompt;
    const cost = d.estimatedCost;
    const tool = d.tool;
    const isRun = !!d.isRunning;
    const isHi = !!d.isHighlight;
    const isSel = !!selected;

    // Type-aware styling + icon proxy (text symbols for zero-dependency delight)
    const typeMeta: Record<string, { border: string; badge: string; sym: string }> = {
      start: { border: 'border-emerald-400/60', badge: 'bg-emerald-500/10 text-emerald-400', sym: '▶' },
      end: { border: 'border-rose-400/60', badge: 'bg-rose-500/10 text-rose-400', sym: '●' },
      agent: { border: 'border-sky-400/60', badge: 'bg-sky-500/10 text-sky-400', sym: '🤖' },
      tool: { border: 'border-violet-400/60', badge: 'bg-violet-500/10 text-violet-400', sym: '🔧' },
      'human-gate': { border: 'border-amber-400/60', badge: 'bg-amber-500/10 text-amber-400', sym: '⏸' },
      parallel: { border: 'border-cyan-400/60', badge: 'bg-cyan-500/10 text-cyan-400', sym: '⫽' },
      merge: { border: 'border-slate-400/60', badge: 'bg-slate-500/10 text-slate-400', sym: '⧉' },
    };
    const meta = typeMeta[type as string] || typeMeta.agent;

    return (
      <div
        className={`px-3 py-2 rounded-2xl border text-[11px] min-w-[138px] max-w-[220px] bg-[#0a0a0c]/90 backdrop-blur select-none shadow-sm transition-all ${meta.border}
          ${isSel || isHi ? 'ring-1 ring-white/60' : ''}
          ${isRun ? 'ring-1 ring-emerald-400 bg-emerald-500/5' : ''}`}
        role="button"
        aria-label={`${type} node: ${label}${model ? ' ' + model : ''}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-1.5 font-medium tracking-[-0.1px]">
          <span className="opacity-70">{meta.sym}</span>
          <span className="truncate">{label}</span>
          {model && <span className="ml-auto text-[9px] px-1 py-px rounded bg-white/10 tabular-nums">{model}</span>}
        </div>
        {prompt && <div className="mt-0.5 text-[9px] text-white/50 line-clamp-2 leading-tight">{prompt}</div>}
        {tool && <div className="mt-0.5 text-[9px] text-violet-400/90">{tool}</div>}
        {cost != null && <div className="mt-0.5 text-emerald-400 tabular-nums text-[10px]">~${Number(cost).toFixed(2)}</div>}
        {isRun && <div className="mt-1 text-[9px] text-emerald-400">▶ RUNNING</div>}
        {type === 'human-gate' && <div className="text-amber-400 text-[9px] mt-0.5">human gate</div>}
        {(isSel || isHi) && <div className="text-[8px] text-white/30 mt-1">selected</div>}
      </div>
    );
  }, []);

  const nodeTypes: NodeTypes = React.useMemo(() => ({
    start: CustomNode,
    agent: CustomNode,
    tool: CustomNode,
    'human-gate': CustomNode,
    parallel: CustomNode,
    merge: CustomNode,
    end: CustomNode,
  }), [CustomNode]);

  // Sync changes back to seed graph (positions from drag, etc)
  const onNodesChange = React.useCallback((changes: NodeChange[]) => {
    const posChanges = changes.filter(c => c.type === 'position' && (c as any).dragging === false);
    if (posChanges.length === 0) return;
    const updated = (graph.nodes || []).map((gn: any) => {
      const ch = posChanges.find((c: any) => c.id === gn.id);
      if (ch && (ch as any).position) {
        return { ...gn, position: (ch as any).position };
      }
      return gn;
    });
    onChange({ nodes: updated, edges: graph.edges || [] });
  }, [graph, onChange]);

  const onEdgesChange = React.useCallback((changes: EdgeChange[]) => {
    const removes = changes.filter(c => c.type === 'remove').map(c => (c as any).id as string);
    if (removes.length === 0) return;
    onChange({
      nodes: graph.nodes || [],
      edges: (graph.edges || []).filter((e: any) => !removes.includes(e.id)),
    });
  }, [graph, onChange]);

  const onConnect = React.useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    if (wouldCreateCycle(graph, connection.source, connection.target)) {
      toast.error('Cycle would be created — edge blocked (demo rule)');
      return;
    }
    const newEdge = {
      id: `e_${Date.now().toString(36)}`,
      source: connection.source,
      target: connection.target,
    };
    onChange({
      nodes: graph.nodes || [],
      edges: [...(graph.edges || []), newEdge],
    });
    toast.success('Edge connected');
  }, [graph, onChange]);

  const handleNodeClick = React.useCallback((_evt: any, node: any) => {
    setSel(node.id);
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  const handlePaneClick = React.useCallback(() => {
    setSel(null);
  }, []);

  // Add node from internal palette (keyboard + mouse reachable)
  const addFromPalette = React.useCallback((typ: NodeType) => {
    const existing = graph.nodes || [];
    const maxX = existing.length ? Math.max(0, ...existing.map((n: any) => n.position?.x || 0)) + 210 : 140;
    const yJ = (existing.length % 3) * 46;
    const nid = `${typ}_${Date.now().toString(36).slice(-5)}`;
    let nn: any;
    if (typ === 'agent') nn = { id: nid, type: 'agent', label: 'Agent', position: { x: maxX, y: 130 + yJ }, model: DEFAULT_MODEL, prompt: 'Added via palette', estimatedCost: 0.5 };
    else if (typ === 'tool') nn = { id: nid, type: 'tool', label: 'Tool', position: { x: maxX, y: 130 + yJ }, tool: 'palette.tool', estimatedCost: 0.08 };
    else if (typ === 'human-gate') nn = { id: nid, type: 'human-gate', label: 'Gate', position: { x: maxX, y: 130 + yJ }, timeoutSec: 900 };
    else if (typ === 'parallel') nn = { id: nid, type: 'parallel', label: 'Parallel', position: { x: maxX, y: 130 + yJ } };
    else if (typ === 'merge') nn = { id: nid, type: 'merge', label: 'Merge', position: { x: maxX, y: 130 + yJ } };
    else nn = { id: nid, type: typ, label: typ, position: { x: maxX, y: 130 + yJ } };
    onChange({ nodes: [...existing, nn], edges: graph.edges || [] });
    setSel(nid);
    toast.success(`+ ${typ}`);
  }, [graph, onChange]);

  // Empty / error states (every user-visible state handled)
  if (!graph || !Array.isArray(graph.nodes)) {
    return (
      <div className="h-full flex items-center justify-center text-red-400 text-sm border border-white/10 rounded-xl">
        Error: invalid graph data
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" role="application" aria-label="Interactive workflow canvas. Drag nodes, connect from handles, use prompt bar above.">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.35}
        maxZoom={1.9}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <Background color="#333" gap={18} />
        <Controls />
        <MiniMap
          nodeColor={(n) => (runningNodeIds.includes(n.id) ? '#10b981' : '#555')}
          maskColor="rgba(0,0,0,0.65)"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <Panel position="top-left" className="bg-[#0a0a0c]/90 border border-white/10 rounded-md px-1 py-0.5 flex gap-1 text-[10px]">
          {(['agent', 'tool', 'human-gate', 'parallel', 'merge'] as const).map(t => (
            <button
              key={t}
              onClick={() => addFromPalette(t)}
              className="px-1.5 py-px rounded hover:bg-white/10 border border-white/10 active:scale-[0.985]"
              aria-label={`Add ${t} node`}
            >
              +{t === 'human-gate' ? 'gate' : t}
            </button>
          ))}
        </Panel>
        <Panel position="bottom-center" className="text-[9px] text-white/30 pointer-events-none">drag • connect handles • del/backspace • snap 20px • zoom/pan</Panel>
      </ReactFlow>

      {/* Empty state overlay (delight + a11y) */}
      {graph.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="empty-state pointer-events-auto max-w-[280px] text-center py-8">
            <div className="text-sm mb-1">Empty canvas</div>
            <div className="text-white/50 text-xs">Use the prompt input above or the +palette in top-left to create nodes. Connect with drag from handles.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple virtualized log list (no extra deps)
function VirtualLogList({ logs, onNodeClick }: { logs: any[]; onNodeClick?: (nodeId: string) => void }) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const rowH = 22;
  const viewH = 320;
  const total = logs.length;
  const startIdx = Math.max(0, Math.floor(scrollTop / rowH) - 4);
  const endIdx = Math.min(total, startIdx + Math.ceil(viewH / rowH) + 10);
  const visible = logs.slice(startIdx, endIdx);
  const offsetY = startIdx * rowH;

  return (
    <div 
      className="flex-1 overflow-auto font-mono text-[11px] bg-black/70 rounded-xl p-3 space-y-px scrollbar-thin"
      style={{ height: viewH }}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: total * rowH, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {visible.length === 0 && <div className="empty-state py-6 text-white/40 text-xs">No logs for this execution.</div>}
          {visible.map((log, i) => {
            const idx = startIdx + i;
            return (
              <div 
                key={idx} 
                className="log-line px-2 py-px text-white/75 flex items-center gap-2 cursor-pointer hover:bg-white/5"
                onClick={() => log.nodeId && onNodeClick?.(log.nodeId)}
              >
                <span className="text-white/40 tabular-nums w-[58px] shrink-0">{(log as any).ts || (log as any).timestamp}</span>
                <span className="text-white/50 shrink-0">{log.nodeId}</span>
                <span className="text-white/80">{log.message}</span>
                {log.costDelta != null && <span className="text-emerald-400/80">+${log.costDelta}</span>}
                {log.latencyMs != null && <span className="text-white/40">({log.latencyMs}ms)</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Skeleton block
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded ${className}`} />;
}

type View = 'ops' | 'sim' | 'market';

export default function ForgeOpsDemo() {
  const [seed, setSeed] = React.useState<DemoSeed>(() => cloneSeed(DEMO_SEED));
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState('ws_acme');
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState('wf_research');
  const [selectedExecId, setSelectedExecId] = React.useState<string | null>(null);
  const [persona, setPersona] = React.useState<'owner' | 'admin' | 'editor' | 'viewer'>('owner');
  const [activityFeed, setActivityFeed] = React.useState<Array<{ts: string, action: string, by: string}>>([
    {ts: '14:41', action: 'Started research swarm', by: 'maya@acme.ai (Owner)'},
    {ts: '14:42', action: 'Approved gate on node-03', by: 'alex@acme.ai (Admin)'},
  ]);
  const [cmdOpen, setCmdOpen] = React.useState(false);

  const [view, setView] = React.useState<View>('ops');

  // Execution detail state (panel)
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailExecId, setDetailExecId] = React.useState<string | null>(null);
  const [highlightedNode, setHighlightedNode] = React.useState<string | null>(null);

  // F-0018: canvas selection (separate from global highlight for props panel)
  const [selectedCanvasNodeId, setSelectedCanvasNodeId] = React.useState<string | null>(null);
  // local prompt for "create via prompt" E2E path (uses the F-0018 promptToGraph wiring)
  const [canvasPrompt, setCanvasPrompt] = React.useState('');

  // Marketplace state
  const [marketQuery, setMarketQuery] = React.useState('');
  const [marketCategories, setMarketCategories] = React.useState<string[]>([]);
  const [marketMinRating, setMarketMinRating] = React.useState(0);
  const [marketMaxCost, setMarketMaxCost] = React.useState(10);
  const [previewTpl, setPreviewTpl] = React.useState<Template | null>(null);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [publishForm, setPublishForm] = React.useState({ name: '', category: 'Research', description: '' });

  // Simulation Arena state
  const [simWorkflowId, setSimWorkflowId] = React.useState('wf_research');
  const [simDatasetId, setSimDatasetId] = React.useState('ds_papers');
  const [simConcurrency, setSimConcurrency] = React.useState(3);
  const [simDepth, setSimDepth] = React.useState<'standard' | 'deep'>('standard');
  const [simRunning, setSimRunning] = React.useState(false);
  const [simResults, setSimResults] = React.useState<null | {
    a: { cost: number; success: number; latency: number; trace: string[] };
    b: { cost: number; success: number; latency: number; trace: string[] };
    recs: string[];
  }>(null);

  const datasets = React.useMemo(() => getSyntheticDatasets(), []);
  const ws = seed.workspaces.find(w => w.id === selectedWorkspaceId)!;
  const workflow = getWorkflowById(seed, selectedWorkflowId);
  const wsExecutions = getExecutionsForWorkflow(seed, selectedWorkflowId).filter(e => !e.workspaceId || e.workspaceId === selectedWorkspaceId);
  const selectedExec = selectedExecId ? seed.executions.find(e => e.id === selectedExecId) : wsExecutions.find(e => e.status === 'running') || wsExecutions[0];
  const detailExec = detailExecId ? seed.executions.find(e => e.id === detailExecId) : null;
  const runningNodeIds = (selectedExec?.trace || []) as string[];

  const canIntervene = userCanIntervene(persona);
  const canEdit = userCanEdit(persona); // simple RBAC demo via seed helper (exercises pure gating for tests)

  // Categories for filters
  const allCategories = React.useMemo(() => Array.from(new Set(seed.templates.map(t => t.category))), [seed.templates]);

  // Filtered marketplace templates
  const filteredTemplates = React.useMemo(() => {
    return seed.templates.filter(t => {
      const q = marketQuery.trim().toLowerCase();
      const matchesQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.author.toLowerCase().includes(q);
      const matchesCat = marketCategories.length === 0 || marketCategories.includes(t.category);
      const matchesRating = t.rating >= marketMinRating;
      const matchesCost = t.estimatedAvgCost <= marketMaxCost;
      return matchesQ && matchesCat && matchesRating && matchesCost;
    });
  }, [seed.templates, marketQuery, marketCategories, marketMinRating, marketMaxCost]);

  // F-0018: clear stale canvas selection if the selected node disappears (e.g. after market import or reset)
  React.useEffect(() => {
    if (selectedCanvasNodeId && workflow) {
      const exists = (workflow.graph?.nodes || []).some((n: any) => n.id === selectedCanvasNodeId);
      if (!exists) setSelectedCanvasNodeId(null);
    }
  }, [selectedWorkflowId, workflow?.graph?.nodes?.length]);

  // Live ticker — enhanced with graph-aware log generation
  React.useEffect(() => {
    const id = setInterval(() => {
      setSeed(current => {
        const next = cloneSeed(current);
        let mutated = false;

        next.executions.forEach(exec => {
          if (exec.status === 'running' && exec.workflowId) {
            const wf = getWorkflowById(next, exec.workflowId);
            if (wf) {
              const prevNode = exec.logs.length > 0 ? exec.logs[exec.logs.length - 1].nodeId : undefined;
              const newLog = generateGraphAwareLog(wf.graph, exec.logs.length, prevNode);
              exec.logs = [...(exec.logs || []), newLog];
              exec.totalCost = (exec.totalCost || 0) + (newLog.costDelta || 0);
              exec.durationMs = (exec.durationMs || 0) + (newLog.latencyMs || 1100);
              if (newLog.nodeId && !exec.trace.includes(newLog.nodeId)) {
                (exec.trace as string[]).push(newLog.nodeId);
              }
              mutated = true;

              // Auto-complete a few for liveliness (deterministic-ish)
              if (exec.logs.length > 13 && (exec.logs.length % 5 === 0)) {
                exec.status = (exec.logs.length % 7 !== 0) ? 'succeeded' : 'failed';
                if (!exec.endedAt) exec.endedAt = new Date().toISOString();
                mutated = true;
              }
            }
          }
        });

        return mutated ? next : current;
      });
    }, 860);

    return () => clearInterval(id);
  }, []);

  function appendLog(msg: string, nodeId = 'system') {
    if (!selectedExec) return;
    setSeed(current => {
      const next = cloneSeed(current);
      const exec = next.executions.find(e => e.id === selectedExec.id);
      if (exec) {
        const cost = +(0.07 + ((exec.logs?.length || 0) % 5) * 0.09).toFixed(2);
        exec.logs = [...(exec.logs || []), { 
          ts: new Date().toISOString().slice(11,19), 
          nodeId, 
          message: msg, 
          level: 'info' as const,
          costDelta: cost 
        }];
        exec.totalCost = (exec.totalCost || 0) + cost;
      }
      return next;
    });
  }

  function intervene(action: string, nodeId = 'gate') {
    if (!canIntervene || !selectedExec) return;
    appendLog(`Intervention: ${action}`, nodeId);
    toast.success(`Applied: ${action}`);
    if (selectedExec.status === 'running' && /approve|gate/i.test(action)) {
      setTimeout(() => appendLog('Gate passed — continuing', 'gate'), 380);
    }
  }

  function toggleRun(execId?: string) {
    const targetId = execId || selectedExec?.id;
    if (!targetId) return;
    setSeed(current => {
      const next = cloneSeed(current);
      const exec = next.executions.find(e => e.id === targetId);
      if (exec) {
        if (exec.status === 'running') {
          exec.status = 'paused';
          appendLogToExec(next, exec.id, 'Paused by operator', 'system');
        } else {
          exec.status = 'running';
          appendLogToExec(next, exec.id, 'Resumed by operator', 'system');
        }
      }
      return next;
    });
  }

  function appendLogToExec(next: DemoSeed, execId: string, msg: string, nodeId: string) {
    const exec = next.executions.find(e => e.id === execId);
    if (!exec) return;
    const cost = +(0.06 + ((exec.logs?.length || 0) % 4) * 0.07).toFixed(2);
    exec.logs = [...(exec.logs || []), { ts: new Date().toISOString().slice(11,19), nodeId, message: msg, level: 'info' as const, costDelta: cost }];
    exec.totalCost = (exec.totalCost || 0) + cost;
  }

  function resetDemo() {
    setSeed(cloneSeed(DEMO_SEED));
    setSelectedExecId(null);
    setDetailExecId(null);
    setDetailOpen(false);
    setSimResults(null);
    setHighlightedNode(null);
    setSelectedCanvasNodeId(null);
    toast.info('Demo data reset to pristine seed state');
  }

  function switchWorkspace(id: string) {
    setSelectedWorkspaceId(id);
    const firstWf = seed.workflows.find(w => w.workspaceId === id) || seed.workflows[0];
    setSelectedWorkflowId(firstWf.id);
    setSelectedExecId(null);
    setDetailOpen(false);
    setDetailExecId(null);
    setSelectedCanvasNodeId(null);
  }

  function openExecutionDetail(exec: Execution) {
    setDetailExecId(exec.id);
    setDetailOpen(true);
    setHighlightedNode(null);
    setSelectedExecId(exec.id);
  }

  function closeDetail() {
    setDetailOpen(false);
    // keep last selected for main canvas highlight
  }

  function handleTraceClick(nodeId: string) {
    setHighlightedNode(nodeId);
    // If there is a selected running exec, also inject a focus log
    if (selectedExec && selectedExec.status === 'running') {
      appendLog(`Focus on node ${nodeId}`, nodeId);
    }
    toast(`Trace node: ${nodeId}`);
  }

  // F-0018: central mutator for the *current* workflow's graph (all via cloneSeed)
  function updateCurrentWorkflowGraph(mutator: (g: WorkflowGraph) => WorkflowGraph) {
    setSeed(current => {
      const next = cloneSeed(current);
      const wf = next.workflows.find(w => w.id === selectedWorkflowId);
      if (wf) {
        wf.graph = mutator(JSON.parse(JSON.stringify(wf.graph)));
        wf.lastRunAt = new Date().toISOString();
      }
      return next;
    });
  }

  // F-0018: start a fresh running execution for current wf so ticker + canvas highlights activate
  function startLiveRunForCurrent() {
    if (!canIntervene) {
      toast.error('Viewer persona cannot start runs');
      return;
    }
    const wf = workflow;
    if (!wf) return;
    setSeed(current => {
      const next = cloneSeed(current);
      const newExecId = 'exec_' + Date.now().toString(36);
      next.executions.unshift({
        id: newExecId,
        workflowId: selectedWorkflowId,
        workspaceId: selectedWorkspaceId,
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        totalCost: 0.01,
        durationMs: 600,
        tokens: 40,
        triggeredBy: persona === 'viewer' ? 'guest@demo' : `${persona}@demo`,
        logs: [{ ts: new Date().toISOString().slice(11,19), nodeId: 'start', message: 'Live run started from canvas', level: 'info' as const, costDelta: 0.01 }],
        trace: [] as string[],
      } as any);
      return next;
    });
    setSelectedExecId(null);
    setDetailOpen(false);
    toast.success('Live simulation started — nodes will highlight as trace advances');
  }

  // F-0021: toast helper for viewer read-only rejection (mirrors canIntervene pattern)
  function rejectViewerEdit(action = 'edit the graph') {
    toast.error(`Read-only: viewers cannot ${action}`);
  }

  // F-0018: prompt -> high quality nodes (uses lib helper + seed realism)
  function handleCreateFromPrompt(text: string) {
    if (!canEdit) { rejectViewerEdit('create nodes'); return; }
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const { nodes: newNs, edges: newEs } = promptToGraph(trimmed);
    if (newNs.length === 0) {
      toast.error('Prompt did not map to any nodes (try "researcher", "gate", "search tool")');
      return;
    }
    updateCurrentWorkflowGraph(g => {
      const offset = (g.nodes.length % 5) * 6;
      const positioned = newNs.map((nn, i) => ({
        ...nn,
        position: { x: (nn.position?.x || 220) + offset, y: (nn.position?.y || 140) + (i % 3) * 26 },
      }));
      return { nodes: [...g.nodes, ...positioned], edges: [...g.edges, ...newEs] };
    });
    toast.success(`Created ${newNs.length} node(s) from prompt`);
    // auto clear selection so new props can be picked
    setSelectedCanvasNodeId(null);
  }

  // F-0018: palette add (used by buttons + inside canvas)
  function addNodeOfType(typ: NodeType) {
    if (!canEdit) { rejectViewerEdit('add nodes'); return; }
    if (!workflow) return;
    const existing = workflow.graph.nodes;
    const maxX = existing.length ? Math.max(...existing.map(n => n.position?.x || 0)) + 210 : 160;
    const yJitter = (existing.length % 4) * 48 - 60;
    const nid = `${typ}_${Date.now().toString(36).slice(-5)}`;
    let newNode: any;
    if (typ === 'agent') {
      newNode = { id: nid, type: 'agent', label: 'New Agent', position: { x: maxX, y: 160 + yJitter }, model: DEFAULT_MODEL, prompt: 'Process task from palette', estimatedCost: 0.52 };
    } else if (typ === 'tool') {
      newNode = { id: nid, type: 'tool', label: 'New Tool', position: { x: maxX, y: 160 + yJitter }, tool: 'custom.tool', estimatedCost: 0.09 };
    } else if (typ === 'human-gate') {
      newNode = { id: nid, type: 'human-gate', label: 'Review Gate', position: { x: maxX, y: 160 + yJitter }, timeoutSec: 1800 };
    } else if (typ === 'parallel') {
      newNode = { id: nid, type: 'parallel', label: 'Parallel', position: { x: maxX, y: 160 + yJitter } };
    } else if (typ === 'merge') {
      newNode = { id: nid, type: 'merge', label: 'Merge', position: { x: maxX, y: 160 + yJitter } };
    } else {
      newNode = { id: nid, type: typ, label: typ[0].toUpperCase() + typ.slice(1), position: { x: maxX, y: 160 + yJitter } };
    }
    updateCurrentWorkflowGraph(g => ({ nodes: [...g.nodes, newNode], edges: g.edges }));
    setSelectedCanvasNodeId(nid);
    toast.success(`Added ${typ}`);
  }

  // E2E helper: simulate a drag by mutating selected (or first) node position via the update helper
  function simulateDrag() {
    if (!canEdit) { rejectViewerEdit('drag nodes'); return; }
    if (!workflow || workflow.graph.nodes.length === 0) return;
    const nid = selectedCanvasNodeId || workflow.graph.nodes[0].id;
    updateCurrentWorkflowGraph(g => {
      const ns = g.nodes.map(n =>
        n.id === nid
          ? { ...n, position: { x: (n.position?.x || 0) + 42, y: (n.position?.y || 0) + 18 } }
          : n
      );
      return { nodes: ns, edges: g.edges };
    });
    toast.success('Drag simulated — node position updated');
  }

  // E2E coverage: export script + docker buttons (produce real downloadable stubs, no secrets)
  function exportAsScript() {
    if (!workflow) return;
    const code = `#!/usr/bin/env bash
# ForgeOps exported workflow script (demo)
# Workflow: ${workflow.name}
# Nodes: ${getNodeCount(workflow.graph)}  Edges: ${getEdgeCount(workflow.graph)}
# Est cost from graph: $${computeGraphCost(workflow.graph).toFixed(2)}
echo "Running ${workflow.name} (self-hosted stub)"
# In real export this would be the runnable TS/JS + docker
`;
    const blob = new Blob([code], { type: 'text/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${workflow.id}.sh`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported shell script (runnable stub)');
  }

  function exportDocker() {
    if (!workflow) return;
    const yml = `version: '3.8'
services:
  ${workflow.id.replace(/-/g,'_')}:
    image: node:20-alpine
    environment:
      - WORKFLOW=${workflow.name}
      - NODES=${getNodeCount(workflow.graph)}
    command: ["node", "-e", "console.log('ForgeOps self-hosted run of ${workflow.name}')"]
`;
    const blob = new Blob([yml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `docker-${workflow.id}.yml`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported docker-compose snippet');
  }

  // F-0018: save current graph as a new marketplace template (demo seed only)
  function saveCurrentGraphAsTemplate() {
    if (!canEdit) { rejectViewerEdit('save templates'); return; }
    if (!workflow) return;
    const tplName = `${workflow.name} (canvas)`;
    setSeed(current => {
      const next = cloneSeed(current);
      const copyGraph: WorkflowGraph = JSON.parse(JSON.stringify(workflow.graph));
      const newTpl: Template = {
        id: 'tpl_' + Date.now().toString(36),
        name: tplName,
        category: 'Custom',
        description: 'Saved from interactive canvas (demo only)',
        rating: 4.5,
        usageCount: 1,
        sampleGraph: copyGraph,
        tags: ['canvas', 'user'],
        estimatedAvgCost: workflow.avgCost || 1.2,
        author: persona === 'viewer' ? 'Guest' : 'You (canvas)',
      };
      next.templates = [newTpl, ...next.templates];
      return next;
    });
    toast.success(`Saved "${tplName}" to marketplace`);
    setView('market');
  }

  // Cost trend data derived from recent executions (demo only)
  const costTrend = React.useMemo(() => {
    const execs = [...seed.executions]
      .filter(e => e.workspaceId === selectedWorkspaceId || !e.workspaceId)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const buckets: Record<string, number> = {};
    execs.forEach(e => {
      const day = e.startedAt.slice(0, 10);
      buckets[day] = (buckets[day] || 0) + (e.totalCost || 0);
    });
    return Object.entries(buckets).slice(-8).map(([day, spend]) => ({ day: day.slice(5), spend: +spend.toFixed(2) }));
  }, [seed.executions, selectedWorkspaceId]);

  // Overview metrics
  const activeRuns = seed.executions.filter(e => e.status === 'running').length;
  const totalSpend = ws.monthlySpend;
  const successRate = Math.round((wsExecutions.filter(e => e.status === 'succeeded').length / Math.max(1, wsExecutions.length)) * 100);
  const templateCount = seed.templates.length;

  // Recent executions for table (top 8)
  const recentExecs = React.useMemo(() => {
    return [...wsExecutions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 8);
  }, [wsExecutions]);

  // Command palette actions
  const commands = React.useMemo(() => ([
    { id: 'pause', label: 'Pause / Resume current run', category: 'Operations', action: () => toggleRun() },
    { id: 'approve', label: 'Approve current human gate', category: 'Operations', action: () => intervene('Approved by operator') },
    { id: 'inject', label: 'Inject context into running node', category: 'Operations', action: () => intervene('Context injected: prioritize latest signals') },
    { id: 'reject', label: 'Reject current gate (fail fast)', category: 'Operations', action: () => intervene('Gate rejected — aborting branch') },
    { id: 'view-ops', label: 'Go to Operations Center', category: 'Navigate', action: () => { setView('ops'); setCmdOpen(false); } },
    { id: 'view-sim', label: 'Go to Simulation Arena', category: 'Navigate', action: () => { setView('sim'); setCmdOpen(false); } },
    { id: 'view-market', label: 'Go to Marketplace', category: 'Navigate', action: () => { setView('market'); setCmdOpen(false); } },
    { id: 'run-ab', label: 'Run A/B simulation on current workflow', category: 'Simulation', action: () => { setView('sim'); setSimWorkflowId(selectedWorkflowId); runSimulation(); } },
    { id: 'publish-tpl', label: 'Publish current workflow as template', category: 'Marketplace', action: () => { setPublishOpen(true); setCmdOpen(false); } },
    { id: 'reset', label: 'Reset all demo data', category: 'System', action: () => resetDemo() },
    { id: 'switch-ws', label: 'Switch to Personal workspace', category: 'Navigate', action: () => switchWorkspace('ws_personal') },
    { id: 'switch-persona', label: 'Switch to viewer persona', category: 'System', action: () => setPersona('viewer') },
    // F-0018 canvas actions (available in command palette too)
    { id: 'canvas-run', label: 'Start live run from current canvas graph', category: 'Canvas', action: () => startLiveRunForCurrent() },
    { id: 'canvas-save-tpl', label: 'Save current canvas graph as template', category: 'Canvas', action: () => saveCurrentGraphAsTemplate() },
    { id: 'canvas-add-agent', label: 'Add agent node to canvas', category: 'Canvas', action: () => addNodeOfType('agent') },
  ]), [selectedWorkflowId, selectedExec, startLiveRunForCurrent, saveCurrentGraphAsTemplate, addNodeOfType]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      if (e.key === ' ' && !cmdOpen && view === 'ops') {
        e.preventDefault();
        toggleRun();
      }
      if (e.key.toLowerCase() === 'escape' && cmdOpen) setCmdOpen(false);
      if (e.key.toLowerCase() === 'escape' && detailOpen) { setDetailOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen, toggleRun, view, detailOpen]);

  // Start a run from a template (used by marketplace "start now")
  function startRunFromTemplate(templateId: string, importGraph = false) {
    // Graph import is a mutation; viewer cannot import
    if (importGraph && !canEdit) { rejectViewerEdit('import graph from template'); return; }
    const tpl = seed.templates.find(t => t.id === templateId);
    if (!tpl) return;

    setSeed(current => {
      const next = cloneSeed(current);
      const newExecId = 'exec_' + Date.now().toString(36);
      const newExec: any = {
        id: newExecId,
        workflowId: selectedWorkflowId,
        workspaceId: selectedWorkspaceId,
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        totalCost: 0.02,
        durationMs: 1400,
        tokens: 180,
        triggeredBy: 'demo@forgeops',
        logs: [{ ts: new Date().toISOString().slice(11,19), nodeId: 'start', message: `Started from template: ${tpl.name}`, level: 'info' as const, costDelta: 0.02 }],
        trace: ['start'] as string[],
      };
      next.executions.unshift(newExec);

      // Optionally import the template's sample graph into the currently selected workflow for the canvas
      if (importGraph) {
        const wf = next.workflows.find(w => w.id === selectedWorkflowId);
        if (wf) {
          wf.graph = JSON.parse(JSON.stringify(tpl.sampleGraph));
          wf.lastRunAt = new Date().toISOString();
        }
      }
      return next;
    });

    toast.success(importGraph ? `Imported graph + started run from ${tpl.name}` : `New run started from ${tpl.name}`);
    setView('ops');
    setPreviewTpl(null);
  }

  // "Use in workspace" — import graph to current workflow (no run) or start run
  function useTemplateInWorkspace(tpl: Template, startRun = true) {
    if (!canEdit) { rejectViewerEdit('import graph templates'); return; }
    setSeed(current => {
      const next = cloneSeed(current);
      const wf = next.workflows.find(w => w.id === selectedWorkflowId);
      if (wf) {
        wf.graph = JSON.parse(JSON.stringify(tpl.sampleGraph));
        wf.lastRunAt = new Date().toISOString();
      }
      if (startRun) {
        const newExecId = 'exec_' + Date.now().toString(36);
        next.executions.unshift({
          id: newExecId,
          workflowId: selectedWorkflowId,
          workspaceId: selectedWorkspaceId,
          status: 'running' as const,
          startedAt: new Date().toISOString(),
          totalCost: 0.01,
          durationMs: 900,
          tokens: 90,
          triggeredBy: 'demo@forgeops',
          logs: [{ ts: new Date().toISOString().slice(11,19), nodeId: 'start', message: `Run started from marketplace: ${tpl.name}`, level: 'info' as const, costDelta: 0.01 }],
          trace: ['start'] as string[],
        } as any);
      }
      return next;
    });
    toast.success(startRun ? `Graph imported + run started: ${tpl.name}` : `Graph imported to workspace: ${tpl.name}`);
    setPreviewTpl(null);
    setView('ops');
  }

  // Publish your own (stub) — creates a new template in demo seed state
  function publishOwnTemplate() {
    if (!canEdit) { rejectViewerEdit('publish templates'); return; }
    if (!publishForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSeed(current => {
      const next = cloneSeed(current);
      const stubGraph: WorkflowGraph = {
        nodes: [
          { id: 'p1', type: 'start', label: 'Start', position: { x: 60, y: 90 } },
          { id: 'p2', type: 'agent', label: publishForm.name.slice(0, 28), position: { x: 220, y: 70 }, model: DEFAULT_MODEL, estimatedCost: 0.6 },
          { id: 'p3', type: 'end', label: 'Done', position: { x: 420, y: 90 } },
        ],
        edges: [
          { id: 'pe1', source: 'p1', target: 'p2' },
          { id: 'pe2', source: 'p2', target: 'p3' },
        ],
      };
      const newTpl: Template = {
        id: 'tpl_' + Date.now().toString(36),
        name: publishForm.name.trim(),
        category: publishForm.category,
        description: publishForm.description.trim() || 'User-published template (demo)',
        rating: 4.2,
        usageCount: 1,
        sampleGraph: stubGraph,
        tags: ['demo', 'user'],
        estimatedAvgCost: 0.72,
        author: persona === 'viewer' ? 'Guest' : 'You',
      };
      next.templates = [newTpl, ...next.templates];
      return next;
    });
    toast.success(`Published "${publishForm.name}" to demo marketplace`);
    setPublishOpen(false);
    setPublishForm({ name: '', category: 'Research', description: '' });
    setView('market');
  }

  // Simulation runner (deterministic, rich)
  function runSimulation() {
    setSimRunning(true);
    setSimResults(null);

    // Small artificial delay for skeleton delight
    setTimeout(() => {
      setSeed(current => {
        const next = cloneSeed(current);
        const wf = getWorkflowById(next, simWorkflowId);
        const ds = datasets.find(d => d.id === simDatasetId)!;

        // Base stats from the workflow's historical avg + variance from seed executions
        const hist = next.executions.filter(e => e.workflowId === simWorkflowId);
        const baseCost = wf ? wf.avgCost : 1.8;
        const baseSucc = wf ? wf.successRate : 94;
        const baseLat = hist.length ? Math.round(hist.reduce((s, e) => s + e.durationMs, 0) / hist.length / 1000) : 180;

        // Variant A: "heavy" (deeper, more parallel, higher cost, higher success)
        // Variant B: "fast" (shallower, lower cost, slightly lower success)
        const aFactor = simDepth === 'deep' ? 1.22 : 1.0;
        const bFactor = 0.68;

        const aCost = +(baseCost * aFactor * (0.9 + (simConcurrency - 2) * 0.04)).toFixed(2);
        const bCost = +(baseCost * bFactor * (0.85 + (simConcurrency - 2) * 0.02)).toFixed(2);

        const aSucc = Math.min(99.5, Math.max(88, Math.round(baseSucc + (simDepth === 'deep' ? 1.8 : -0.6))));
        const bSucc = Math.min(98, Math.max(82, Math.round(baseSucc - 2.4)));

        const aLat = Math.round(baseLat * (simDepth === 'deep' ? 1.18 : 0.92));
        const bLat = Math.round(baseLat * 0.71);

        // Traces (synthetic but plausible node ids from the graph)
        const nodeIds = (wf?.graph.nodes || []).map(n => n.id);
        const aTrace = nodeIds.length ? nodeIds.slice(0, Math.min(6, nodeIds.length)) : ['n1','n2','n3'];
        const bTrace = nodeIds.length ? nodeIds.slice(0, Math.min(4, nodeIds.length)) : ['n1','n2'];

        // Deterministic recommendations
        const recs: string[] = [];
        if (aLat > bLat * 1.4) recs.push('High latency on heavy path → consider parallelizing prep before slow external step');
        if (aCost > bCost * 1.7) recs.push('Heavy variant cost is 1.7× fast variant — gate heavy path behind a cheap classifier');
        if (bSucc < aSucc - 4) recs.push('Fast variant success gap >4% — add a cheap verification agent after the quick path');
        if (ds.domain === 'research' && simDepth === 'standard') recs.push('Academic workloads benefit from "deep" on the synthesis node; consider a late-stage deep pass only on high-signal branches');
        if (simConcurrency >= 4) recs.push('High fan-out detected — ensure merge step has dedup + early exit to control token burn');
        if (recs.length === 0) recs.push('Balanced profile — no strong recommendation; monitor the merge step for duplication rate');

        const result = {
          a: { cost: aCost, success: aSucc, latency: aLat, trace: aTrace },
          b: { cost: bCost, success: bSucc, latency: bLat, trace: bTrace },
          recs,
        };
        setSimResults(result);
        setSimRunning(false);

        // Also surface a tiny toast
        toast.success(`A/B complete — ${simWorkflowId} on ${ds.name}`);
        return next;
      });
    }, 180);
  }

  // Intervention panel actions from detail view
  function detailIntervene(action: string) {
    if (!detailExec || !canIntervene) return;
    setSeed(current => {
      const next = cloneSeed(current);
      const exec = next.executions.find(e => e.id === detailExec.id);
      if (exec) {
        const cost = +(0.05 + ((exec.logs?.length || 0) % 3) * 0.06).toFixed(2);
        exec.logs = [...(exec.logs || []), { ts: new Date().toISOString().slice(11,19), nodeId: 'gate', message: `Intervention: ${action}`, level: 'gate' as const, costDelta: cost }];
        exec.totalCost = (exec.totalCost || 0) + cost;
        if (/pause/i.test(action)) exec.status = 'paused';
        if (/resume|approve/i.test(action) && exec.status !== 'succeeded' && exec.status !== 'failed') exec.status = 'running';
        if (/reject/i.test(action)) { exec.status = 'failed'; exec.endedAt = new Date().toISOString(); }
      }
      return next;
    });
    toast.success(`Detail: ${action}`);
  }

  // Cost breakdown for an execution (from its logs)
  function getCostBreakdown(exec: Execution) {
    const byNode: Record<string, number> = {};
    (exec.logs || []).forEach(l => {
      if (l.costDelta) byNode[l.nodeId] = (byNode[l.nodeId] || 0) + l.costDelta;
    });
    return Object.entries(byNode).map(([nodeId, cost]) => ({ nodeId, cost: +cost.toFixed(2) })).sort((a, b) => b.cost - a.cost);
  }

  // Demo instructions string (surface only)
  const demoInstructions = "Operations: click rows or live items to open detail. Simulation: pick workflow + dataset, tweak params, Run A/B. Marketplace: filter, preview, Use in workspace or Start run. All state lives in the cloned seed — Reset anytime.";

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-white/10 flex items-center px-6 justify-between text-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to marketing
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div className="font-semibold">ForgeOps Demo — {ws.name}</div>
          <Badge variant={ws.plan === 'team' ? 'success' : 'default'}>{ws.plan}</Badge>
          <div className="text-[10px] text-white/40 hidden md:block">Product surface only • seed-driven</div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div>Persona: 
            <select data-testid="persona-select" value={persona} onChange={e => setPersona(e.target.value as any)} className="ml-1 bg-transparent border border-white/20 rounded px-1.5 py-0.5">
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <Button variant="ghost" size="sm" onClick={resetDemo}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset seed</Button>
          <Button variant="ghost" size="sm" onClick={() => setCmdOpen(true)}><Command className="h-3.5 w-3.5 mr-1" /> ⌘K</Button>
          <Link href="/" className="px-3 py-1 rounded border border-white/15 hover:bg-white/5">Exit demo</Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav + workspace list */}
        <div className="w-64 border-r border-white/10 p-4 flex flex-col text-sm">
          <div className="uppercase text-[10px] tracking-[2px] text-white/40 mb-2 px-2">SECTIONS</div>
          <button data-testid="view-ops" onClick={() => setView('ops')} className={`text-left px-3 py-1.5 rounded mb-1 flex items-center gap-2 ${view === 'ops' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <Activity className="h-4 w-4" /> Operations Center
          </button>
          <button data-testid="view-sim" onClick={() => setView('sim')} className={`text-left px-3 py-1.5 rounded mb-1 flex items-center gap-2 ${view === 'sim' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <Target className="h-4 w-4" /> Simulation Arena
          </button>
          <button data-testid="view-market" onClick={() => setView('market')} className={`text-left px-3 py-1.5 rounded mb-1 flex items-center gap-2 ${view === 'market' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <Layers className="h-4 w-4" /> Marketplace
          </button>

          <div className="mt-6 uppercase text-[10px] tracking-[2px] text-white/40 mb-2 px-2">WORKSPACES</div>
          {seed.workspaces.map(w => (
            <button key={w.id} data-testid={`workspace-${w.id}`} onClick={() => switchWorkspace(w.id)} className={`text-left px-3 py-1.5 rounded mb-1 flex justify-between ${selectedWorkspaceId === w.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              <span>{w.name}</span>
              <span className="text-white/40 text-xs tabular-nums">${w.monthlySpend}</span>
            </button>
          ))}

          <div className="mt-6 uppercase text-[10px] tracking-[2px] text-white/40 mb-2 px-2">CURRENT WORKFLOW</div>
          <select value={selectedWorkflowId} onChange={e => { setSelectedWorkflowId(e.target.value); setSelectedExecId(null); setSelectedCanvasNodeId(null); }} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm mb-4">
            {seed.workflows.filter(w => !w.workspaceId || w.workspaceId === selectedWorkspaceId).map(wf => (
              <option key={wf.id} value={wf.id}>{wf.name}</option>
            ))}
          </select>

          <div className="mt-auto text-[10px] text-white/40 px-2 space-y-1">
            <div>All data from lib/seed.ts</div>
            <div>Mutations via cloneSeed • Export produces real JSON</div>
            <button onClick={() => {
              const data = JSON.stringify({ workflow: workflow?.graph, seedSnapshot: seed }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'forgeops-export.json'; a.click();
              toast.success('Exported current state + graph');
            }} className="text-xs underline">Export current graph + state</button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub header with actions */}
          <div className="h-12 border-b border-white/10 px-6 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {view === 'ops' && (
                <>
                  <Button data-testid="btn-toggle-run" onClick={() => toggleRun()} disabled={!canIntervene || !selectedExec} variant={selectedExec?.status === 'running' ? 'outline' : 'default'}>
                    {selectedExec?.status === 'running' ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                    {selectedExec?.status === 'running' ? 'Pause' : 'Resume'} run
                  </Button>
                  <Button data-testid="btn-approve-gate" onClick={() => intervene('Approved by ' + persona)} disabled={!canIntervene || !selectedExec} size="sm">Approve gate</Button>
                  <Button data-testid="btn-inject" onClick={() => intervene('Context injected')} disabled={!canIntervene} variant="ghost" size="sm">Inject</Button>
                  <Button data-testid="btn-reject-gate" onClick={() => intervene('Gate rejected')} disabled={!canIntervene} variant="ghost" size="sm">Reject</Button>
                </>
              )}
              {view === 'sim' && (
                <div className="text-white/60 text-xs">Pick workflow + dataset • tweak params • run deterministic A/B</div>
              )}
              {view === 'market' && (
                <div className="text-white/60 text-xs">12 templates • filter by category, cost, rating • preview + import</div>
              )}
            </div>
            <div className="text-xs text-white/60 flex items-center gap-4">
              <span>{wsExecutions.length} executions</span>
              <span>Active: {activeRuns}</span>
              <button onClick={() => setCmdOpen(true)} className="flex items-center gap-1"><Command className="h-3 w-3" /> Command palette</button>
            </div>
          </div>

          {/* View body */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* OPERATIONS CENTER */}
            {view === 'ops' && (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Active Runs', value: activeRuns, sub: 'across all workspaces', icon: <Activity className="h-4 w-4" /> },
                    { label: 'Workspace Spend', value: `$${totalSpend.toFixed(2)}`, sub: 'this month', icon: <TrendingUp className="h-4 w-4" /> },
                    { label: 'Success Rate', value: `${successRate}%`, sub: `${wsExecutions.length} runs`, icon: <CheckCircle className="h-4 w-4" /> },
                    { label: 'Marketplace Templates', value: templateCount, sub: 'ready to import', icon: <Layers className="h-4 w-4" /> },
                  ].map((c, i) => (
                    <Card key={i} className="p-4">
                      <div className="text-white/50 text-xs flex items-center gap-2">{c.icon}{c.label}</div>
                      <div className="text-4xl font-semibold tabular-nums tracking-tighter mt-1">{c.value}</div>
                      <div className="text-[11px] text-white/40 mt-0.5">{c.sub}</div>
                    </Card>
                  ))}
                </div>

                {/* Cost trend + Live ticker side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <Card className="lg:col-span-3 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">Cost Trend (derived from seed executions)</div>
                      <div className="text-[10px] text-white/40">Recharts • last 8 days</div>
                    </div>
                    <div className="w-full" style={{ height: 220, minHeight: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={costTrend.length ? costTrend : [{ day: '—', spend: 0 }]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" />
                          <YAxis stroke="rgba(255,255,255,0.3)" />
                          <Tooltip contentStyle={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)' }} />
                          <Line type="monotone" dataKey="spend" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-[10px] text-white/40 mt-2">Trend is computed live from the cloned seed executions for the selected workspace.</div>
                  </Card>

                  <Card className="lg:col-span-2 p-4 flex flex-col">
                    <div className="font-medium mb-2 flex items-center gap-2"><Zap className="h-4 w-4" /> Live Ticker — Running Executions</div>
                    <div className="space-y-2 overflow-auto flex-1 text-sm">
                      {seed.executions.filter(e => e.status === 'running').length === 0 && (
                        <div className="empty-state py-6 text-xs">No runs currently executing. Start one from the canvas controls or Marketplace.</div>
                      )}
                      {seed.executions.filter(e => e.status === 'running').map(exec => {
                        const wf = getWorkflowById(seed, exec.workflowId);
                        return (
                          <button key={exec.id} onClick={() => openExecutionDetail(exec)} className="w-full text-left border border-white/10 rounded-xl px-3 py-2 hover:bg-white/5 flex items-center justify-between">
                            <div>
                              <div className="font-medium">{wf?.name || exec.workflowId} <span className="text-white/40">· {exec.id}</span></div>
                              <div className="text-[11px] text-white/50">{exec.triggeredBy} • ${(exec.totalCost || 0).toFixed(2)} • {Math.round((exec.durationMs || 0)/1000)}s</div>
                            </div>
                            <Badge variant="success">RUNNING</Badge>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-white/40 mt-2">Ticker uses graph-aware log generation from seed graphs (see lib/seed.ts).</div>
                  </Card>
                </div>

                {/* Recent executions table */}
                <Card className="p-4">
                  <div className="font-medium mb-3">Recent Executions — {ws.name}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-white/50 text-xs">
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 pr-3">ID</th>
                          <th className="text-left py-2 pr-3">Workflow</th>
                          <th className="text-left py-2 pr-3">Status</th>
                          <th className="text-right py-2 pr-3">Cost</th>
                          <th className="text-right py-2 pr-3">Duration</th>
                          <th className="text-left py-2 pr-3">Started</th>
                          <th className="text-left py-2">Triggered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentExecs.length === 0 && (
                          <tr><td colSpan={7} className="py-8 text-center text-white/40 text-xs">No executions for this workspace yet.</td></tr>
                        )}
                        {recentExecs.map(exec => {
                          const wf = getWorkflowById(seed, exec.workflowId);
                          return (
                            <tr key={exec.id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => openExecutionDetail(exec)}>
                              <td className="py-2 pr-3 font-mono text-xs text-white/70">{exec.id}</td>
                              <td className="py-2 pr-3">{wf?.name || exec.workflowId}</td>
                              <td className="py-2 pr-3">
                                {exec.status === 'running' && <Badge variant="success">RUNNING</Badge>}
                                {exec.status === 'succeeded' && <Badge variant="success">SUCCEEDED</Badge>}
                                {exec.status === 'failed' && <Badge variant="warning">FAILED</Badge>}
                                {exec.status === 'paused' && <Badge variant="outline">PAUSED</Badge>}
                              </td>
                              <td className="py-2 pr-3 text-right tabular-nums">${(exec.totalCost || 0).toFixed(2)}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{Math.round((exec.durationMs || 0)/1000)}s</td>
                              <td className="py-2 pr-3 text-xs text-white/60">{new Date(exec.startedAt).toLocaleString()}</td>
                              <td className="py-2 text-xs text-white/60">{exec.triggeredBy}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[10px] text-white/40 mt-3">Click any row to open Execution Detail (virtualized logs, clickable trace, cost breakdown, interventions).</div>
                </Card>

                {/* Canvas + quick logs for the current selection — now full interactive React Flow (F-0018) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <Card className="lg:col-span-3 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Visual Workflow — {workflow?.name}</div>
                      <div className="flex items-center gap-2">
                        {/* Load from seed graphs (tied to seed per AC) — viewer read-only */}
                        {getSeedGraphs().map(sg => (
                          <button
                            key={sg.id}
                            onClick={() => {
                              if (!canEdit) { rejectViewerEdit('load graphs'); return; }
                              updateCurrentWorkflowGraph(() => JSON.parse(JSON.stringify(sg.graph)));
                              setSelectedCanvasNodeId(null);
                              toast.success(`Loaded ${sg.name}`);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 disabled:opacity-40"
                            aria-label={`Load seed graph: ${sg.name}`}
                            aria-disabled={!canEdit}
                          >
                            {sg.name.split(' ').slice(0, 2).join(' ')}
                          </button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={saveCurrentGraphAsTemplate} disabled={!canEdit}>Save as template</Button>
                        <Button data-testid="btn-run-live" size="sm" onClick={startLiveRunForCurrent} disabled={!canIntervene || !workflow}>▶ Run live</Button>
                        <Button data-testid="btn-sim-drag" size="sm" variant="ghost" onClick={simulateDrag} disabled={!canEdit}>Drag</Button>
                        <Button data-testid="btn-export-script" size="sm" variant="ghost" onClick={exportAsScript}>Export script</Button>
                        <Button data-testid="btn-export-docker" size="sm" variant="ghost" onClick={exportDocker}>Export docker</Button>
                      </div>
                    </div>

                    {/* Prompt-to-agent (AC: creates high-quality agent nodes from natural language) + palette */}
                    <div className="mb-2 flex flex-wrap gap-2">
                      <input
                        id="prompt-create"
                        data-testid="canvas-prompt-input"
                        placeholder={canEdit ? "Prompt to create (e.g. 'deep arxiv researcher' or 'human gate for legal' or 'parallel web scrapers')" : "Read-only: viewers cannot create nodes"}
                        className="flex-1 min-w-[260px] bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm placeholder:text-white/40 disabled:opacity-50"
                        aria-label="Natural language prompt to create nodes"
                        disabled={!canEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateFromPrompt((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <Button data-testid="btn-create-from-prompt" size="sm" disabled={!canEdit} onClick={() => {
                        const el = document.getElementById('prompt-create') as HTMLInputElement | null;
                        if (el) { handleCreateFromPrompt(el.value); el.value = ''; }
                      }}>Create</Button>
                      {/* Quick palette also in header for discoverability (mirrors inside-canvas palette) */}
                      {(['agent','tool','human-gate','parallel','merge'] as const).map(t => (
                        <Button data-testid={`btn-add-${t}`} key={t} size="sm" variant="ghost" disabled={!canEdit} onClick={() => addNodeOfType(t)} aria-label={`Add ${t} via palette`}>+{t === 'human-gate' ? 'gate' : t}</Button>
                      ))}
                    </div>

                    {/* The split: interactive canvas | live properties panel */}
                    <div className="flex gap-3 flex-1" style={{ minHeight: 420 }}>
                      <div data-testid="workflow-canvas" className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-black/60" style={{ height: 420 }}>
                        <InteractiveCanvas
                          graph={(workflow?.graph || { nodes: [], edges: [] })}
                          onChange={(newG) => {
                            if (!canEdit) { rejectViewerEdit('edit the graph'); return; }
                            updateCurrentWorkflowGraph(() => newG);
                          }}
                          runningNodeIds={runningNodeIds}
                          highlightedNodeId={highlightedNode}
                          onNodeClick={(id) => {
                            appendLog(`Node inspected: ${id}`, id);
                            if (selectedExec && selectedExec.status === 'running') intervene(`Manual focus on ${id}`, id);
                            setHighlightedNode(id);
                            setSelectedCanvasNodeId(id);
                          }}
                          selectedNodeId={selectedCanvasNodeId}
                          onSelectedNodeChange={setSelectedCanvasNodeId}
                        />
                      </div>

                      {/* Sidebar properties panel (AC: edit prompt, model, cost estimates; live) */}
                      <div className="w-72 rounded-xl border border-white/10 bg-white/5 p-3 overflow-auto text-xs" style={{ height: 420 }}>
                        <div className="font-medium text-white/80 mb-2 flex items-center justify-between">
                          Properties <span className="text-white/30 text-[9px]">{canEdit ? 'live edits' : 'read-only'}</span>
                        </div>
                        {!selectedCanvasNodeId && (
                          <div className="text-white/40 py-8 text-center">
                            Select a node on the canvas to view{canEdit ? ' and edit' : ''}.<br />
                            {canEdit ? 'Drag nodes • connect handles • snap-to-grid • delete key.' : 'Read-only: viewers cannot edit the graph.'}
                          </div>
                        )}
                        {selectedCanvasNodeId && workflow && (() => {
                          const node = workflow.graph.nodes.find((n: any) => n.id === selectedCanvasNodeId);
                          if (!node) {
                            return <div className="text-white/40 py-6">Node not found (graph may have changed).</div>;
                          }
                          const updateNode = (patch: Partial<any>) => {
                            if (!canEdit) { rejectViewerEdit('edit node properties'); return; }
                            updateCurrentWorkflowGraph(g => ({
                              nodes: g.nodes.map((nn: any) => nn.id === node.id ? { ...nn, ...patch } : nn),
                              edges: g.edges,
                            }));
                          };
                          return (
                            <div className="space-y-3" role="form" aria-label="Node properties editor">
                              {!canEdit && (
                                <div data-testid="viewer-readonly-notice" className="text-[10px] text-amber-400/80 bg-amber-400/10 rounded px-2 py-1">
                                  Read-only: viewers cannot edit the graph
                                </div>
                              )}
                              <div>
                                <div className="text-white/50 mb-0.5">Label</div>
                                <input value={node.label || ''} onChange={e => updateNode({ label: e.target.value })} disabled={!canEdit} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 disabled:opacity-50" aria-label="Node label" />
                              </div>
                              <div>
                                <div className="text-white/50 mb-0.5">Prompt</div>
                                <textarea value={node.prompt || ''} onChange={e => updateNode({ prompt: e.target.value })} disabled={!canEdit} rows={3} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 font-mono text-[10px] disabled:opacity-50" aria-label="Node prompt" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-white/50 mb-0.5">Model</div>
                                  <select value={node.model || ''} onChange={e => updateNode({ model: e.target.value || undefined })} disabled={!canEdit} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 disabled:opacity-50" aria-label="Model">
                                    <option value="">—</option>
                                    {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <div className="text-white/50 mb-0.5">Est. cost</div>
                                  <input type="number" step="0.01" value={node.estimatedCost ?? ''} onChange={e => updateNode({ estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined })} disabled={!canEdit} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 tabular-nums disabled:opacity-50" aria-label="Estimated cost" />
                                </div>
                              </div>
                              {node.tool && (
                                <div>
                                  <div className="text-white/50 mb-0.5">Tool</div>
                                  <input value={node.tool} onChange={e => updateNode({ tool: e.target.value })} disabled={!canEdit} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 disabled:opacity-50" />
                                </div>
                              )}
                              <div className="pt-1 flex gap-2">
                                <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => {
                                  if (!canEdit) { rejectViewerEdit('delete nodes'); return; }
                                  // delete via properties too
                                  updateCurrentWorkflowGraph(g => ({
                                    nodes: g.nodes.filter((nn: any) => nn.id !== node.id),
                                    edges: g.edges.filter((e: any) => e.source !== node.id && e.target !== node.id),
                                  }));
                                  setSelectedCanvasNodeId(null);
                                  toast.info('Node deleted');
                                }}>Delete node</Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedCanvasNodeId(null)}>Deselect</Button>
                              </div>
                              <div className="text-[9px] text-white/30 pt-1">Changes update the live cloned seed graph immediately. Running sims use the current graph structure for traces.</div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-white/40">React Flow • drag/drop/connect • prompt-to-nodes • properties • seed load/save • live sim highlights. Desktop-first.</div>
                  </Card>

                  <Card className="lg:col-span-2 p-4 flex flex-col">
                    <div className="font-medium mb-2">Quick Logs — {selectedExec?.id || 'none'}</div>
                    <div className="flex-1 overflow-auto font-mono text-[11px] bg-black/70 rounded-xl p-3 space-y-px mb-3 scrollbar-thin">
                      {(selectedExec?.logs || []).slice(-12).map((log, i) => (
                        <div key={i} className="log-line px-2 py-px text-white/75">
                          {(log as any).ts} — {log.nodeId} • {log.message} {log.costDelta ? `(+$${log.costDelta})` : ''}
                        </div>
                      ))}
                      {(!selectedExec || (selectedExec.logs || []).length === 0) && <div className="empty-state text-xs py-6">No logs. Start or select a run.</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => appendLog('Manual note added')}>Add note</Button>
                      <Button size="sm" variant="ghost" onClick={() => selectedExec && openExecutionDetail(selectedExec)}>Open full detail</Button>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* SIMULATION ARENA */}
            {view === 'sim' && (
              <div className="space-y-6">
                <div>
                  <div className="text-2xl font-semibold tracking-tight">Simulation Arena</div>
                  <div className="text-white/60">Side-by-side A/B with deterministic recommendations based on seed graph traces.</div>
                </div>

                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-white/50 mb-1">Workflow</div>
                      <select value={simWorkflowId} onChange={e => setSimWorkflowId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm">
                        {seed.workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 mb-1">Synthetic Dataset</div>
                      <select value={simDatasetId} onChange={e => setSimDatasetId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm">
                        {datasets.map(d => <option key={d.id} value={d.id}>{d.name} — {d.description}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 mb-1">Concurrency</div>
                      <input type="range" min={1} max={6} step={1} value={simConcurrency} onChange={e => setSimConcurrency(parseInt(e.target.value))} className="w-full" />
                      <div className="text-xs tabular-nums text-white/60">{simConcurrency}× parallel</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 mb-1">Depth</div>
                      <div className="flex gap-2">
                        {(['standard', 'deep'] as const).map(d => (
                          <button key={d} onClick={() => setSimDepth(d)} className={`px-3 py-1.5 rounded border text-sm ${simDepth === d ? 'bg-white/10 border-white/30' : 'border-white/10 hover:bg-white/5'}`}>{d}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button onClick={runSimulation} disabled={simRunning}>
                      {simRunning ? 'Running A/B…' : 'Run A/B Simulation'}
                    </Button>
                    <span className="text-xs text-white/40 ml-3">Results are deterministic functions of seed graph + params + dataset size.</span>
                  </div>
                </Card>

                {/* Results */}
                {simRunning && (
                  <Card className="p-4">
                    <div className="text-sm text-white/60 mb-2">Computing variants…</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-28" />
                      <Skeleton className="h-28" />
                    </div>
                    <Skeleton className="h-12 mt-4" />
                  </Card>
                )}

                {simResults && !simRunning && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <Card className="lg:col-span-2 p-4">
                      <div className="uppercase tracking-[1px] text-[10px] text-white/50 mb-1">Variant A — Heavy</div>
                      <div className="text-3xl font-semibold tabular-nums">${simResults.a.cost}</div>
                      <div className="text-sm text-white/70 mt-1">{simResults.a.success}% success • {simResults.a.latency}s latency</div>
                      <div className="mt-3 text-xs text-white/50">Trace: {simResults.a.trace.join(' → ')}</div>
                    </Card>
                    <Card className="lg:col-span-2 p-4">
                      <div className="uppercase tracking-[1px] text-[10px] text-white/50 mb-1">Variant B — Fast</div>
                      <div className="text-3xl font-semibold tabular-nums">${simResults.b.cost}</div>
                      <div className="text-sm text-white/70 mt-1">{simResults.b.success}% success • {simResults.b.latency}s latency</div>
                      <div className="mt-3 text-xs text-white/50">Trace: {simResults.b.trace.join(' → ')}</div>
                    </Card>
                    <Card className="lg:col-span-1 p-4">
                      <div className="uppercase tracking-[1px] text-[10px] text-white/50 mb-1">Delta</div>
                      <div className="text-sm">Cost: <span className="tabular-nums">{((simResults.a.cost - simResults.b.cost) / simResults.b.cost * 100).toFixed(0)}%</span></div>
                      <div className="text-sm">Success: <span className="tabular-nums">{(simResults.a.success - simResults.b.success).toFixed(1)}pp</span></div>
                      <div className="text-sm">Latency: <span className="tabular-nums">{((simResults.a.latency - simResults.b.latency) / simResults.b.latency * 100).toFixed(0)}%</span></div>
                    </Card>

                    <Card className="lg:col-span-5 p-4">
                      <div className="font-medium mb-2">Auto Recommendations (deterministic rules)</div>
                      <ul className="space-y-1 text-sm">
                        {simResults.recs.map((r, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400">→</span> {r}</li>)}
                      </ul>
                      <div className="text-[10px] text-white/40 mt-3">Rules inspect relative cost/latency/success gaps and dataset domain. No randomness.</div>
                    </Card>
                  </div>
                )}

                {!simResults && !simRunning && (
                  <Card className="p-6 text-sm text-white/60">Run a simulation to see side-by-side cost, success, latency and deterministic recommendations derived from the seed graph structure.</Card>
                )}
              </div>
            )}

            {/* MARKETPLACE */}
            {view === 'market' && (
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight">Marketplace</div>
                    <div className="text-white/60">12 production-grade templates. Preview graphs, import, or publish your own (demo state only).</div>
                  </div>
                  <Button onClick={() => setPublishOpen(true)}><Plus className="h-4 w-4 mr-1" /> Publish your own</Button>
                </div>

                {/* Filters */}
                <Card className="p-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-xs text-white/50"><Search className="h-3.5 w-3.5" /> Search</div>
                    <input value={marketQuery} onChange={e => setMarketQuery(e.target.value)} placeholder="name, author, description…" className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm w-64" />
                    <div className="flex items-center gap-2 text-xs text-white/50 ml-2"><Filter className="h-3.5 w-3.5" /> Categories</div>
                    {allCategories.map(cat => {
                      const active = marketCategories.includes(cat);
                      return (
                        <button key={cat} onClick={() => setMarketCategories(active ? marketCategories.filter(c => c !== cat) : [...marketCategories, cat])} className={`text-xs px-2.5 py-1 rounded border ${active ? 'bg-white/10 border-white/30' : 'border-white/10 hover:bg-white/5'}`}>{cat}</button>
                      );
                    })}
                    <div className="flex items-center gap-2 text-xs text-white/50 ml-2">Min rating</div>
                    {[0, 4.3, 4.6, 4.8].map(r => (
                      <button key={r} onClick={() => setMarketMinRating(r)} className={`text-xs px-2 py-1 rounded border ${marketMinRating === r ? 'bg-white/10 border-white/30' : 'border-white/10 hover:bg-white/5'}`}>{r || 'Any'}</button>
                    ))}
                    <div className="flex items-center gap-2 text-xs text-white/50 ml-2">Max est. cost</div>
                    <input type="range" min={0.1} max={8} step={0.1} value={marketMaxCost} onChange={e => setMarketMaxCost(parseFloat(e.target.value))} className="w-40" />
                    <div className="text-xs tabular-nums text-white/60">${marketMaxCost.toFixed(1)}</div>
                    <Button variant="ghost" size="sm" onClick={() => { setMarketQuery(''); setMarketCategories([]); setMarketMinRating(0); setMarketMaxCost(10); }}>Clear</Button>
                  </div>
                </Card>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTemplates.length === 0 && <div className="col-span-full empty-state py-10">No templates match your filters.</div>}
                  {filteredTemplates.map(t => (
                    <Card key={t.id} data-testid={`marketplace-card-${t.id}`} className="p-4 flex flex-col" onClick={() => setPreviewTpl(t)}>
                      <div className="flex items-start justify-between">
                        <div className="font-medium pr-2">{t.name}</div>
                        <div className="text-emerald-400 text-xs flex items-center gap-1"><Star className="h-3 w-3" />{t.rating}</div>
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">{t.author} • {t.category}</div>
                      <div className="text-sm text-white/70 mt-3 line-clamp-3">{t.description}</div>
                      <div className="mt-auto pt-4 flex items-center justify-between text-xs text-white/50">
                        <div>~${t.estimatedAvgCost} avg • {t.usageCount.toLocaleString()} uses</div>
                        <div className="text-white/40">Preview →</div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="text-[10px] text-white/40">{demoInstructions}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution Detail Panel (slide-in style via Modal for simplicity + keyboard escape) */}
      <Modal open={detailOpen} onClose={closeDetail} title={detailExec ? `Execution ${detailExec.id}` : 'Execution'} description={detailExec ? `${getWorkflowById(seed, detailExec.workflowId)?.name} • ${detailExec.status}` : ''}>
        {detailExec && (
          <div className="space-y-4 text-sm">
            {/* Step trace (clickable) */}
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Step Trace (click to highlight)</div>
              <div className="flex flex-wrap gap-1.5">
                {(detailExec.trace || []).length === 0 && <span className="text-white/40 text-xs">No trace yet.</span>}
                {(detailExec.trace || []).map((nid, idx) => (
                  <button key={idx} onClick={() => handleTraceClick(nid)} className={`px-2 py-0.5 rounded border text-xs ${highlightedNode === nid ? 'bg-white/15 border-white/60' : 'border-white/15 hover:bg-white/5'}`}>{nid}</button>
                ))}
              </div>
            </div>

            {/* Mini graph with highlight */}
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Graph (highlighted node)</div>
              <GraphViz 
                graph={getWorkflowById(seed, detailExec.workflowId)?.graph || { nodes: [], edges: [] }} 
                runningNodeIds={detailExec.status === 'running' ? (detailExec.trace as string[]) : []}
                highlightedNodeId={highlightedNode}
                onNodeClick={handleTraceClick}
              />
            </div>

            {/* Cost breakdown */}
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Cost Breakdown (from logs)</div>
              <div className="bg-black/60 rounded-xl p-3">
                {getCostBreakdown(detailExec).length === 0 && <div className="text-white/40 text-xs">No per-node cost deltas recorded.</div>}
                {getCostBreakdown(detailExec).map((row, i) => (
                  <div key={i} className="flex justify-between py-0.5 text-xs"><span className="font-mono text-white/70">{row.nodeId}</span><span>${row.cost}</span></div>
                ))}
                <div className="pt-2 mt-2 border-t border-white/10 text-xs flex justify-between"><span>Total</span><span className="tabular-nums">${(detailExec.totalCost || 0).toFixed(2)}</span></div>
              </div>
            </div>

            {/* Virtualized logs */}
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Logs (virtualized scroller — click rows to highlight node)</div>
              <VirtualLogList logs={detailExec.logs || []} onNodeClick={handleTraceClick} />
            </div>

            {/* Interventions */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Interventions</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!canIntervene} onClick={() => detailIntervene('Pause run')}>Pause</Button>
                <Button size="sm" disabled={!canIntervene} onClick={() => detailIntervene('Approve gate')}>Approve gate</Button>
                <Button size="sm" variant="ghost" disabled={!canIntervene} onClick={() => detailIntervene('Inject: focus on latest signals')}>Inject context</Button>
                <Button size="sm" variant="ghost" disabled={!canIntervene} onClick={() => detailIntervene('Reject gate')}>Reject (fail fast)</Button>
                <Button size="sm" variant="ghost" disabled={!canIntervene} onClick={() => toggleRun(detailExec.id)}>Toggle run/pause</Button>
              </div>
              {!canIntervene && <div className="text-[10px] text-white/40 mt-1">Viewer persona cannot intervene.</div>}
            </div>
          </div>
        )}
      </Modal>

      {/* Marketplace Preview Modal */}
      <Modal 
        open={!!previewTpl} 
        onClose={() => setPreviewTpl(null)} 
        title={previewTpl?.name} 
        description={previewTpl ? `${previewTpl.author} • ${previewTpl.category} • ~$${previewTpl.estimatedAvgCost} avg • ${previewTpl.rating}★` : ''}
      >
        {previewTpl && (
          <div className="space-y-4">
            <div className="text-sm text-white/70">{previewTpl.description}</div>
            <GraphViz graph={previewTpl.sampleGraph} />
            <div className="text-xs text-white/50">Sample graph from seed template. Real runs will vary.</div>
            <div className="flex gap-2 pt-2">
              <Button data-testid="btn-import-start-run" onClick={() => useTemplateInWorkspace(previewTpl, true)}>Use in workspace + start run</Button>
              <Button data-testid="btn-import-graph-only" variant="outline" onClick={() => useTemplateInWorkspace(previewTpl, false)}>Import graph only</Button>
              <Button data-testid="btn-start-run-keep-graph" variant="ghost" onClick={() => startRunFromTemplate(previewTpl.id, false)}>Start run (keep current graph)</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Publish your own stub */}
      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title="Publish your own (demo)" description="Saves a new template into the live demo seed state only.">
        <div className="space-y-3 text-sm">
          <input value={publishForm.name} onChange={e => setPublishForm({ ...publishForm, name: e.target.value })} placeholder="Template name" className="w-full bg-white/5 border border-white/10 rounded px-3 py-2" />
          <select value={publishForm.category} onChange={e => setPublishForm({ ...publishForm, category: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2">
            {allCategories.concat('Custom').filter((v, i, a) => a.indexOf(v) === i).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={publishForm.description} onChange={e => setPublishForm({ ...publishForm, description: e.target.value })} placeholder="Short description" className="w-full h-20 bg-white/5 border border-white/10 rounded px-3 py-2" />
          <Button onClick={publishOwnTemplate} className="w-full">Publish to demo marketplace</Button>
          <div className="text-[10px] text-white/40">This only mutates the in-memory cloned seed for this demo session.</div>
        </div>
      </Modal>

      {/* Command Palette */}
      <AnimatePresence>
        {cmdOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh]" onClick={() => setCmdOpen(false)}>
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111113]/95 backdrop-blur-xl p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-3 py-2 text-sm text-white/60">Command Palette — {view.toUpperCase()}</div>
              <div className="max-h-[360px] overflow-auto">
                {commands.map((c, idx) => (
                  <button key={idx} onClick={() => { c.action(); setCmdOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 flex items-center gap-3 text-sm">
                    <span>{c.label}</span>
                    {c.category && <span className="ml-auto text-[10px] text-white/40">{c.category}</span>}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-white/40 px-3 pt-2 border-t border-white/10">Space: pause/resume (ops) • Esc: close • All actions mutate the cloned seed</div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-[10px] text-center py-3 border-t border-white/10 text-white/40">
        Fully seed-driven demo • {demoInstructions}
      </div>
    </div>
  );
}
