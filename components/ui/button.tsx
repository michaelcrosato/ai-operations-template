'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'subtle';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all select-none ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ' +
      'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985]';

    const variants: Record<string, string> = {
      default:
        'bg-white text-black hover:bg-white/90 shadow-sm dark:bg-white dark:text-black',
      outline:
        'border border-white/20 hover:bg-white/5 text-white dark:text-foreground dark:border-border dark:hover:bg-accent/40',
      ghost:
        'hover:bg-white/10 text-white/90 dark:text-foreground dark:hover:bg-white/5',
      subtle:
        'bg-white/5 hover:bg-white/10 text-white/80 dark:bg-muted/60 dark:text-foreground dark:hover:bg-muted border border-white/10 dark:border-border',
    };

    const sizes: Record<string, string> = {
      default: 'h-10 px-5 text-sm tracking-[-0.1px]',
      sm: 'h-8 px-3.5 text-xs rounded-lg',
      lg: 'h-12 px-8 text-[15px] tracking-[-0.2px]',
      icon: 'h-9 w-9 rounded-xl',
    };

    const variantClass = variants[variant] || variants.default;
    const sizeClass = sizes[size] || sizes.default;

    return (
      <motion.button
        ref={ref as any}
        whileHover={disabled ? {} : { scale: 1.005 }}
        whileTap={disabled ? {} : { scale: 0.975 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className={`${base} ${variantClass} ${sizeClass} ${className}`}
        disabled={disabled}
        aria-disabled={disabled}
        {...(props as any)}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
