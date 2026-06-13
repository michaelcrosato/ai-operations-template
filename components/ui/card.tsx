'use client';

import * as React from 'react';
import { motion, MotionProps } from 'framer-motion';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean; // preserve the beautiful dark glassmorphic look used on landing/demo
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, hover = true, glass = true, onClick, ...props }, ref) => {
    // Premium base: uses theme tokens for light/dark correctness + glass override for product aesthetic
    const base = glass
      ? 'rounded-2xl border border-white/10 bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/5 dark:border-border dark:bg-card/95 dark:text-card-foreground'
      : 'rounded-2xl border border-border bg-card text-card-foreground shadow-sm';

    return (
      <motion.div
        ref={ref}
        whileHover={
          hover && !onClick
            ? { y: -1.5, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }
            : undefined
        }
        whileTap={onClick ? { scale: 0.995 } : undefined}
        onClick={onClick}
        className={`${base} ${hover ? 'hover:border-white/20 dark:hover:border-white/20 transition-colors' : ''} ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
