'use client';

import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info' | 'outline';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variants: Record<string, string> = {
      default:
        'bg-white/10 text-white/80 border border-white/15 dark:bg-muted dark:text-muted-foreground dark:border-border',
      success:
        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
      warning:
        'bg-amber-500/15 text-amber-400 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
      info:
        'bg-sky-500/15 text-sky-400 border border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30',
      outline:
        'border border-white/25 text-white/70 dark:border-border dark:text-foreground/80',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-px text-[10px] font-medium tracking-[0.5px] uppercase ${variants[variant] || variants.default} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
