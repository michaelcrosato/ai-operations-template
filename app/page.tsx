'use client';

import React from 'react';
import { 
  ArrowRight, Play, Users, Zap, Shield, TrendingUp, 
  Globe, Rocket, Check, Moon, Sun, Command as CommandIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CommandPalette } from '@/components/ui/command-palette';
import type { Command } from '@/components/ui/command-palette';

export default function ForgeOpsLanding() {
  const [demoRunning, setDemoRunning] = React.useState(false);
  const [metrics, setMetrics] = React.useState({ runs: 1247, cost: 1842.37, success: 94.2 });

  const handleStartDemo = () => {
    toast.success('Demo workspace created', {
      description: 'Seeded with 3 teams, 12 templates, and live executions.',
    });
    // Scroll to demo section
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRunSimulation = () => {
    if (demoRunning) return;
    setDemoRunning(true);

    toast.loading('Running Research Swarm simulation...', { id: 'sim' });

    // Simulate live updates with realistic numbers
    setTimeout(() => {
      setMetrics(m => ({ ...m, runs: m.runs + 3, cost: +(m.cost + 4.87).toFixed(2) }));
      toast.success('Simulation complete', {
        id: 'sim',
        description: '12 agents • 47 steps • $4.87 • 94s • 100% success',
      });
      setDemoRunning(false);
    }, 1650);
  };

  // Command palette state + delightful marketing-oriented commands (⌘K accessible)
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const marketingCommands: Command[] = [
    { id: 'launch', label: 'Launch demo workspace', hint: '⌘D', action: () => { setCmdOpen(false); handleStartDemo(); } },
    { id: 'run-sim', label: 'Run Research Swarm simulation', hint: '', action: () => { setCmdOpen(false); handleRunSimulation(); } },
    { id: 'scroll-demo', label: 'Jump to interactive demo', hint: '⌘↓', action: () => { setCmdOpen(false); document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }); } },
    { id: 'toggle-theme', label: 'Toggle light / dark', hint: '', action: () => { setCmdOpen(false); setTheme(theme === 'dark' ? 'light' : 'dark'); toast.info(theme === 'dark' ? 'Light mode' : 'Dark mode'); } },
    { id: 'sign-in', label: 'Sign in (demo)', hint: '', action: () => { setCmdOpen(false); toast('Demo sign-in', { description: 'You are now using the seeded demo account.' }); } },
    { id: 'pricing', label: 'View pricing', hint: '', action: () => { setCmdOpen(false); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); } },
  ];

  // Global ⌘K / Ctrl+K listener (beautiful accessible command surface)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-white selection:text-black">
      {/* Premium Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 h-16">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-semibold text-xl tracking-[-1.5px]">F</div>
            <div>
              <div className="font-semibold tracking-tight text-lg">ForgeOps</div>
              <div className="text-[10px] text-white/50 -mt-1">AGENT OPERATIONS</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#demo" className="hover:text-white transition">Live Demo</a>
            <a href="#marketplace" className="hover:text-white transition">Marketplace</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="/pricing" className="hover:text-white transition">Full pricing →</a>
          </div>

          <div className="flex items-center gap-3">
            {/* Premium Command Palette trigger with keyboard hint */}
            <Button 
              variant="subtle" 
              size="sm" 
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-1.5 text-xs tracking-widest"
              aria-label="Open command palette (⌘K)"
            >
              <CommandIcon className="h-3.5 w-3.5" />
              <span>Command</span>
              <kbd className="ml-1">⌘K</kbd>
            </Button>

            {/* Proper theme toggle using next-themes for perfect dark/light support */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                setTheme(next);
                toast.info(next === 'dark' ? 'Dark theme' : 'Light theme');
              }}
              aria-label="Toggle theme"
              className="text-white/70 hover:text-white"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => toast('Demo sign-in', { description: 'You are now using the seeded demo account.' })}>
              Sign in
            </Button>
            <Button size="sm" onClick={handleStartDemo}>
              Start free demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <a href="/demo" className="text-sm px-4 h-9 inline-flex items-center rounded-lg border border-white/20 hover:bg-white/5">
              Open full demo workspace →
            </a>
          </div>
        </div>
      </nav>

      {/* Honest demo disclaimer (reviewer feedback 2026-06-16): make the simulated nature unmissable above the fold */}
      <div className="bg-amber-500/10 border-b border-amber-400/30 text-amber-200/90 text-center text-xs px-4 py-2 tracking-wide">
        Simulated demo — no real agents run, no backend, synthetic data only. The real engineering is the open-source AI operations engine that built this site.
      </div>

      {/* Hero */}
      <div className="pt-24 pb-16 px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs tracking-[2px] mb-6">
          INTERACTIVE DEMO (SIMULATED) • BUILT WITH THE AI OPERATIONS ENGINE
        </div>

        <h1 className="text-7xl md:text-8xl font-semibold tracking-tighter leading-[0.9] mb-6">
          The operating system<br />for AI agent teams.
        </h1>
        <p className="text-2xl text-white/70 max-w-3xl mx-auto mb-6 tracking-tight">
          A simulated, browser-only preview: arrange multi-agent graphs, watch mocked token/dollar
          counters, explore simulation &amp; A/B panels, and generate a starter self-host scaffold.
          No real agents run and nothing leaves your browser.
        </p>
        <p className="text-sm text-emerald-400/90 max-w-2xl mx-auto mb-10 tracking-tight">
          ★ Every line of ForgeOps — product, engine, demo, and this site — was built and is maintained by the exact AI operations system we ship to you.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={handleStartDemo} className="text-base px-9 group">
            Launch demo workspace <Rocket className="ml-2.5 h-5 w-5 group-hover:-translate-y-0.5 transition" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
            <Play className="mr-2 h-4 w-4" /> See 60-second demo
          </Button>
        </div>
        <p className="mt-4 text-xs text-white/50">No credit card • Seeded with synthetic demo data • Runs instantly</p>
      </div>

      {/* Trust bar */}
      <div className="border-y border-white/10 py-5">
        <div className="max-w-5xl mx-auto px-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[3px] text-white/40">
          <div>A self-building demo</div>
          <div className="text-white/60">Synthetic data • no real customers • built and maintained entirely by its own AI engine</div>
          <div className="hidden md:block">•</div>
          <div>Open source on GitHub</div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-6xl mx-auto px-8 py-20 grid md:grid-cols-3 gap-6">
        {[
          { icon: <Zap className="h-6 w-6" />, title: "Visual Canvas + Prompt-to-Swarm", desc: "Drag, connect, or describe in natural language. Complex multi-agent graphs in seconds." },
          { icon: <TrendingUp className="h-6 w-6" />, title: "Real-time Ops & Cost Control", desc: "Live logs, step traces, burn rate, intervention. Know exactly what every run costs and why." },
          { icon: <Shield className="h-6 w-6" />, title: "Simulation, A/B & Human Gates", desc: "Test safely. Compare variants. Insert approvals. Get automatic optimization recommendations." },
        ].map((f, i) => (
          <Card key={i} className="forge-card">
            <div className="text-white/60 mb-4">{f.icon}</div>
            <div className="text-2xl font-semibold tracking-tight mb-3">{f.title}</div>
            <p className="text-white/70 leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </div>

      {/* Feature comparison (world-class table, delightful & scannable) */}
      <div id="compare" className="max-w-6xl mx-auto px-8 pb-16">
        <div className="text-center mb-8">
          <div className="text-white/60 tracking-[3px] text-xs">THE DIFFERENCE IS VISIBLE</div>
          <div className="text-4xl tracking-tighter font-semibold mt-2">ForgeOps vs the alternatives</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/60">
                <th className="py-3 pr-4 font-medium">Capability</th>
                <th className="py-3 px-4 font-medium text-white">ForgeOps</th>
                <th className="py-3 px-4 font-medium">DIY (LangGraph etc + scripts)</th>
                <th className="py-3 px-4 font-medium">LangSmith</th>
                <th className="py-3 px-4 font-medium">Replicate</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {[
                ["Visual canvas & prompt-to-swarm", "Yes — drag or describe, instant graph", "No — code graphs by hand", "Tracing only", "No (model focus)"],
                ["Real-time cost & token visibility", "Live per-step + burn rate + intervene", "Custom logging you build", "Tracing-focused", "Basic logs"],
                ["Simulation, A/B, human gates", "Built-in + one-click variants", "Glue code + manual", "Evals + review add-on", "Limited"],
                ["Marketplace + templates", "12+ curated, publish yours", "Roll your own", "Community (limited)", "Model versions only"],
                ["Export / self-host (no lock-in)", "JSON, TS, Docker — always free", "You are the infra", "Hosted SaaS", "Models only"],
                ["Pricing", "Simple usage, free tier workspaces", "Your infra + LLM spend", "Per-seat + usage tiers", "Usage-based"],
                ["Built & maintained by its own AI engine", "Yes — this site + repo are living proof", "You maintain everything", "Vendor team", "Vendor team"],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 pr-4 font-medium text-white/90">{row[0]}</td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">{row[1]}</td>
                  <td className="py-3 px-4">{row[2]}</td>
                  <td className="py-3 px-4">{row[3]}</td>
                  <td className="py-3 px-4">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-white/40 mt-3 text-center tracking-widest">Illustrative comparison for this demo — synthetic, not independently verified. Export is the escape hatch we actually deliver.</p>
      </div>

      {/* The Demo Section — immediate delight */}
      <div id="demo" className="bg-black/40 border-y border-white/10 py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge>INTERACTIVE PREVIEW</Badge>
              <div className="text-4xl tracking-tighter font-semibold mt-2">Everything you need to run agents in production.</div>
            </div>
            <Button onClick={handleRunSimulation} disabled={demoRunning}>
              {demoRunning ? 'Running…' : 'Run Research Swarm Demo'}
            </Button>
          </div>

          {/* Mini Operations Dashboard Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Metrics strip */}
            <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Executions (30d)", value: metrics.runs.toLocaleString(), change: "+18%" },
                { label: "Total Spend", value: `$${metrics.cost.toLocaleString()}`, change: "-9% vs last month" },
                { label: "Success Rate", value: `${metrics.success}%`, change: "+1.4%" },
                { label: "Active Agents", value: "37", change: "12 running now" },
              ].map((m, idx) => (
                <Card key={idx} className="py-5">
                  <div className="text-xs uppercase tracking-widest text-white/50">{m.label}</div>
                  <div className="text-4xl font-semibold tabular-nums tracking-tighter mt-2">{m.value}</div>
                  <div className="text-emerald-400 text-sm mt-1">{m.change}</div>
                </Card>
              ))}
            </div>

            {/* Fake live log + intervention */}
            <Card className="lg:col-span-7 h-[320px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Live — Research Swarm #A-4821</div>
                <Badge className="bg-emerald-500/20 text-emerald-400">RUNNING</Badge>
              </div>
              <div className="flex-1 overflow-auto font-mono text-[11px] bg-black/60 rounded-xl p-4 space-y-1 scrollbar-thin">
                {[
                  "[14:32:01] node-3 (Grok-4.3) • \"Summarizing 47 papers...\"",
                  "[14:32:04] parallel-1 • 3 branches spawned",
                  "[14:32:11] human-gate • Waiting for approval on external action",
                  "[14:32:14] cost • +$0.41 (current run: $3.12)",
                  "[14:32:19] node-7 • Tool call: web.search (latency 820ms)",
                ].map((l, i) => <div key={i} className="log-line px-2 py-0.5 text-white/80">{l}</div>)}
              </div>
              <div className="pt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast('Intervention sent', { description: 'Injected context into research node.' })}>Inject message</Button>
                <Button size="sm" onClick={() => toast.success('Step approved')}>Approve current gate</Button>
              </div>
            </Card>

            {/* Mini marketplace + export */}
            <Card className="lg:col-span-5">
              <div className="font-medium mb-4">Marketplace — Ready templates</div>
              <div className="space-y-2 text-sm">
                {['Deep Research Swarm', 'Tier-1 Support Agent', 'Competitive Intel Pipeline', 'Content Factory v2'].map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2.5 hover:bg-white/5 cursor-pointer" onClick={() => toast.info(`Imported ${t}`)}>
                    <span>{t}</span>
                    <span className="text-xs text-white/50">Use →</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 text-xs text-white/60">
                One-click import • Fork &amp; publish your own • Export as self-hosted script or Docker
              </div>
            </Card>
          </div>

          <p className="text-center text-white/40 text-xs tracking-widest mt-8">This is a fully interactive seeded preview. Real workspace has full canvas, persistent history, RBAC, and Stripe billing.</p>
        </div>
      </div>

      {/* Marketplace teaser */}
      <div id="marketplace" className="max-w-6xl mx-auto px-8 py-20">
        <div className="text-center mb-10">
          <div className="text-white/60 tracking-[3px] text-xs">DISCOVER • FORK • PUBLISH</div>
          <div className="text-5xl tracking-tighter mt-2">A marketplace of proven agents.</div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {['Customer Success', 'Legal Research', 'Sales Qualification', 'Internal Knowledge'].map((cat, idx) => (
            <Card key={idx} className="text-center py-10 hover:border-white/30 transition cursor-pointer" onClick={() => toast(`Opened ${cat} category`)}>
              <div className="text-xl font-medium">{cat}</div>
              <div className="text-sm text-white/50 mt-1">18 templates • 4.9 avg rating</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing stub */}
      <div id="pricing" className="border-y border-white/10 bg-black/30 py-16 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-4xl tracking-tight mb-3">Simple, usage-based pricing.</div>
          <p className="text-white/70 mb-10">Start free. Scale with confidence. Export and self-host at any time. <a href="/pricing" className="underline hover:no-underline">Full pricing page →</a></p>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            {[
              { tier: 'Free', price: '$0', features: ['3 workspaces', 'Basic monitoring', 'Community templates', 'Self-hosted exports'] },
              { tier: 'Pro', price: '$29', popular: true, features: ['Unlimited workspaces', 'Live intervention', 'A/B testing + recs', 'Priority support', 'Advanced exports'] },
              { tier: 'Team', price: '$99', features: ['RBAC + SSO', 'Shared audit logs', 'Marketplace revenue share', 'Dedicated success', 'Private templates'] },
            ].map((p, i) => (
              <Card key={i} className={p.popular ? 'ring-1 ring-white/70 relative' : ''}>
                {p.popular && <div className="absolute -top-3 right-6 text-[10px] px-3 py-px rounded bg-white text-black tracking-widest">MOST POPULAR</div>}
                <div className="text-2xl">{p.tier}</div>
                <div className="mt-3 mb-6"><span className="text-5xl font-semibold tabular-nums tracking-tighter">{p.price}</span><span className="text-white/60">/mo</span></div>
                <ul className="space-y-2 text-sm text-white/80">
                  {p.features.map((f, fi) => <li key={fi} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />{f}</li>)}
                </ul>
                <Button className="w-full mt-8" variant={p.popular ? 'default' : 'outline'} onClick={() => { toast.success(`${p.tier} plan activated in demo`); toast('Open the full demo workspace to try live RBAC switcher, Stripe test checkout, activity feed, and runnable exports — click "Open full demo workspace" above.'); }}>
                  {p.tier === 'Free' ? 'Start for free' : 'Upgrade'}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <footer className="py-10 text-center text-white/40 text-xs tracking-widest">
        ForgeOps — Built and maintained with its own AI Operations Engine • MIT licensed core • Export anything
      </footer>

      {/* Command Palette — keyboard-first premium delight (⌘K from anywhere) */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={marketingCommands}
        placeholder="Search pages, actions, or settings…"
      />
    </div>
  );
}
