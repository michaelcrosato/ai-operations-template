'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function Modal({ open, onClose, children, title, description }: ModalProps) {
  // Close on Escape + lock scroll lightly
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }}
            className="relative z-10 w-full max-w-[460px] rounded-2xl border border-white/15 bg-[#0a0a0c] text-white shadow-2xl overflow-hidden dark:bg-card dark:border-border dark:text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {(title || description) && (
              <div className="px-5 pt-5 pb-3 border-b border-white/10 dark:border-border">
                {title && <div className="font-semibold tracking-tight text-lg">{title}</div>}
                {description && <p className="mt-1 text-sm text-white/60 dark:text-muted-foreground">{description}</p>}
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
