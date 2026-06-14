'use client';

/**
 * F-0032: Canvas components extracted from app/demo/page.tsx.
 *
 * Contains:
 *   - GraphViz: lightweight SVG-based read-only graph viewer (used in modals)
 *   - InteractiveCanvas: full @xyflow/react interactive canvas for the
 *     Operations Center main view
 *
 * Behavior is IDENTICAL to the inline originals — pure mechanical move.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
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
import type { WorkflowGraph, NodeType } from '@/lib/seed';
import { DEFAULT_MODEL } from '@/lib/models';

// Reusable graph visualizer (enhanced with highlight support)
export function GraphViz({
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
export function InteractiveCanvas({
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
