'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Premium standalone pricing page matching the ForgeOps dark glass aesthetic.
// All states handled via toasts (success "activated"). No new loading needed for stub.
// A11y: semantic headings, buttons have labels, keyboard focus via existing Button.

export default function PricingPage() {
  const tiers = [
    {
      tier: 'Free',
      price: '$0',
      popular: false,
      cta: 'Start for free',
      features: [
        '3 workspaces',
        'Basic monitoring & live logs',
        'Community templates',
        'Self-hosted exports (always free)',
        'Public demo access',
      ],
    },
    {
      tier: 'Pro',
      price: '$29',
      popular: true,
      cta: 'Upgrade to Pro',
      features: [
        'Unlimited workspaces',
        'Live intervention & approvals',
        'A/B testing + automatic recs',
        'Priority support',
        'Advanced exports (TS stub, Docker)',
        'Marketplace publishing',
      ],
    },
    {
      tier: 'Team',
      price: '$99',
      popular: false,
      cta: 'Go Team',
      features: [
        'Everything in Pro',
        'RBAC + SSO',
        'Shared audit logs',
        'Marketplace revenue share',
        'Dedicated success manager',
        'Private templates & workspaces',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Minimal premium nav matching main landing */}
      <nav className="border-b border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 h-16">
          <Link href="/" className="flex items-center gap-3 text-white/90 hover:text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-semibold text-xl tracking-[-1.5px]">F</div>
            <div>
              <div className="font-semibold tracking-tight">ForgeOps</div>
              <div className="text-[10px] text-white/50 -mt-1">PRICING</div>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-white/70 hover:text-white flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <Link href="/demo" className="px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm">
              Open demo workspace →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 pt-16 pb-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs tracking-[2px] mb-4">
            NO SURPRISES • EXPORT FOREVER FREE
          </div>
          <h1 className="text-6xl tracking-tighter font-semibold mb-4">Pricing that respects your agents (and your budget).</h1>
          <p className="text-2xl text-white/70 max-w-2xl mx-auto mb-3 tracking-tight">
            Start free. See real value in minutes. Scale when you love it. Take everything with you via export at any time.
          </p>
          <p className="text-sm text-emerald-400/90 mb-10">This entire platform (and the engine that built it) is itself a customer of the AI ops system we sell.</p>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map((p, i) => (
            <Card key={i} className={p.popular ? 'ring-1 ring-white/70 relative' : ''}>
              {p.popular && (
                <div className="absolute -top-3 right-6 text-[10px] px-3 py-px rounded bg-white text-black tracking-widest">MOST POPULAR</div>
              )}
              <div className="text-2xl font-semibold tracking-tight">{p.tier}</div>
              <div className="mt-3 mb-6">
                <span className="text-6xl font-semibold tabular-nums tracking-tighter">{p.price}</span>
                <span className="text-white/60">/mo</span>
              </div>

              <ul className="space-y-3 text-sm text-white/80 mb-8">
                {p.features.map((f, fi) => (
                  <li key={fi} className="flex gap-3">
                    <Check className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={p.popular ? 'default' : 'outline'}
                onClick={() => {
                  if (p.tier === 'Free') {
                    toast.success('Free workspace activated', { description: 'You now have 3 workspaces in the seeded demo.' });
                  } else {
                    toast.success(`${p.tier} plan activated in demo`, {
                      description: 'All advanced features (intervention, A/B, exports) unlocked for this session.',
                    });
                  }
                }}
                aria-label={`Choose ${p.tier} plan`}
              >
                {p.cta}
              </Button>
              <p className="text-[10px] text-center text-white/40 mt-3 tracking-widest">Cancel anytime. Export always included.</p>
            </Card>
          ))}
        </div>

        {/* Strong self-engine + export messaging */}
        <div className="mt-12 max-w-2xl mx-auto text-center border-t border-white/10 pt-10">
          <div className="flex justify-center mb-4">
            <Rocket className="h-6 w-6 text-white/50" />
          </div>
          <div className="text-lg tracking-tight mb-2">Export is not a marketing line. It is the product contract.</div>
          <p className="text-white/70 text-sm leading-relaxed">
            Every workflow you build can be downloaded as a self-contained runnable artifact. The engine itself is an open MIT-licensed drop-in template.
            You are never hostage to our hosted surface. This is the same engine that built and maintains ForgeOps in production — right now.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-white/50">
            <Link href="/demo" className="underline hover:no-underline">Try everything in the live demo →</Link>
            <span>•</span>
            <Link href="/" className="underline hover:no-underline">Back to the operating system →</Link>
          </div>
        </div>

        {/* Mini FAQ / delightful plain-English notes */}
        <div className="mt-14 text-xs text-white/50 max-w-xl mx-auto">
          <div className="uppercase tracking-[2px] mb-3 text-white/40">Common questions, answered plainly</div>
          <ul className="space-y-2 leading-relaxed">
            <li><strong>Do I need a credit card for the free tier?</strong> No. The demo and free plan need nothing.</li>
            <li><strong>What changes on Pro/Team?</strong> More workspaces, live controls, better support, revenue share if you publish templates. The core visual OS and export are identical.</li>
            <li><strong>Can I really take my agents and leave?</strong> Yes. The export button produces real artifacts you can run without ForgeOps. The engine template is open source.</li>
            <li><strong>Is this built by AI?</strong> Yes — and that is the point. The same system that powers your swarms also builds and runs this company’s own product development loop. You get the proof every day.</li>
          </ul>
        </div>
      </div>

      <footer className="py-8 text-center text-white/30 text-xs tracking-widest border-t border-white/10">
        ForgeOps • Built and maintained with its own AI Operations Engine • Export anything, forever
      </footer>
    </div>
  );
}
