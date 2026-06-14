'use client';

/**
 * F-0029: Live Ticker panel extracted from app/demo/page.tsx.
 *
 * Renders the "Live Ticker — Running Executions" card that shows executions
 * currently in 'running' status with their cost, duration, and triggered-by.
 *
 * Fully controlled: receives the list of running executions and an onClick
 * handler as props. No internal state.
 * data-testid attributes are unchanged from the original inline markup.
 */

import React from 'react';
import { Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Execution } from '@/lib/seed';

export interface LiveTickerPanelProps {
  /** All executions (panel filters to status === 'running' internally) */
  runningExecutions: Execution[];
  /** Map from workflowId to workflow name (for display) */
  workflowNameMap: Record<string, string>;
  /** Called when the user clicks an execution row */
  onExecutionClick: (exec: Execution) => void;
}

export function LiveTickerPanel({
  runningExecutions,
  workflowNameMap,
  onExecutionClick,
}: LiveTickerPanelProps) {
  return (
    <Card className="lg:col-span-2 p-4 flex flex-col">
      <div className="font-medium mb-2 flex items-center gap-2">
        <Zap className="h-4 w-4" /> Live Ticker — Running Executions
      </div>
      <div className="space-y-2 overflow-auto flex-1 text-sm">
        {runningExecutions.length === 0 && (
          <div className="empty-state py-6 text-xs">
            No runs currently executing. Start one from the canvas controls or Marketplace.
          </div>
        )}
        {runningExecutions.map((exec) => {
          const wfName = workflowNameMap[exec.workflowId] || exec.workflowId;
          return (
            <button
              key={exec.id}
              onClick={() => onExecutionClick(exec)}
              className="w-full text-left border border-white/10 rounded-xl px-3 py-2 hover:bg-white/5 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  {wfName} <span className="text-white/40">· {exec.id}</span>
                </div>
                <div className="text-[11px] text-white/50">
                  {exec.triggeredBy} • ${(exec.totalCost || 0).toFixed(2)} •{' '}
                  {Math.round((exec.durationMs || 0) / 1000)}s
                </div>
              </div>
              <Badge variant="success">RUNNING</Badge>
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-white/40 mt-2">
        Ticker uses graph-aware log generation from seed graphs (see lib/seed.ts).
      </div>
    </Card>
  );
}
