'use client';

/**
 * F-0029: Metrics overview cards panel extracted from app/demo/page.tsx.
 *
 * Renders the four KPI cards (Active Runs, Workspace Spend, Success Rate,
 * Marketplace Templates) that appear at the top of the Operations Center view.
 *
 * Fully controlled: all values are passed as props. No internal state.
 * data-testid attributes are unchanged from the original inline markup.
 */

import React from 'react';
import { Activity, TrendingUp, CheckCircle, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface MetricsCardsProps {
  activeRuns: number;
  totalSpend: number;
  successRate: number;
  executionCount: number;
  templateCount: number;
}

export function MetricsCards({
  activeRuns,
  totalSpend,
  successRate,
  executionCount,
  templateCount,
}: MetricsCardsProps) {
  const cards = [
    {
      label: 'Active Runs',
      value: activeRuns,
      sub: 'across all workspaces',
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: 'Workspace Spend',
      value: `$${totalSpend.toFixed(2)}`,
      sub: 'this month',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      sub: `${executionCount} runs`,
      icon: <CheckCircle className="h-4 w-4" />,
    },
    {
      label: 'Marketplace Templates',
      value: templateCount,
      sub: 'ready to import',
      icon: <Layers className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card key={i} className="p-4">
          <div className="text-white/50 text-xs flex items-center gap-2">
            {c.icon}
            {c.label}
          </div>
          <div className="text-4xl font-semibold tabular-nums tracking-tighter mt-1">
            {c.value}
          </div>
          <div className="text-[11px] text-white/40 mt-0.5">{c.sub}</div>
        </Card>
      ))}
    </div>
  );
}
