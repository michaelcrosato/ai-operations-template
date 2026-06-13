'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './modal';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  category?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
}

export function CommandPalette({ open, onClose, commands, placeholder = 'Search commands…' }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint && c.hint.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [query, commands]);

  // Reset active + focus input when palette opens or results change
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after enter animation
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  const execute = (cmd: Command) => {
    cmd.action();
    onClose();
  };

  // Keyboard nav inside palette (arrows + enter)
  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        execute(filtered[activeIndex]);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex]);

  return (
    <Modal open={open} onClose={onClose} title="Command Palette" description="Quick actions • Keyboard navigable">
      <div className="space-y-3">
        {/* Search input — premium focus ring */}
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/40 dark:bg-background/60 dark:border-border dark:placeholder:text-muted-foreground"
            aria-label="Search commands"
          />
          <div className="absolute right-3 top-3 text-[10px] text-white/40 font-mono tracking-widest pointer-events-none">ESC</div>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-auto -mx-1 px-1 py-1 space-y-px text-sm scrollbar-thin" role="listbox" aria-activedescendant={filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined}>
          <AnimatePresence>
            {filtered.length > 0 ? (
              filtered.map((cmd, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <motion.button
                    key={cmd.id}
                    id={`cmd-${cmd.id}`}
                    role="option"
                    aria-selected={isActive}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.1 }}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${isActive ? 'bg-white/10 text-white dark:bg-white/5' : 'hover:bg-white/5 text-white/80 dark:hover:bg-white/5 dark:text-foreground/90'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="font-medium tracking-[-0.1px] truncate">{cmd.label}</div>
                      {cmd.category && <div className="text-[10px] px-1.5 py-px rounded bg-white/10 text-white/50 dark:bg-muted dark:text-muted-foreground shrink-0">{cmd.category}</div>}
                    </div>
                    {cmd.hint && <div className="text-[10px] text-white/40 font-mono tracking-[1px] shrink-0 pl-3">{cmd.hint}</div>}
                  </motion.button>
                );
              })
            ) : (
              <div className="py-9 text-center">
                <div className="text-white/40 text-sm">No matching commands</div>
                <div className="text-white/30 text-xs mt-1">Try “pause”, “approve”, or “metrics”</div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-white/40 dark:border-border dark:text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>↑↓</span> <span className="opacity-60">navigate</span>
            <span className="pl-2">↵</span> <span className="opacity-60">run</span>
          </div>
          <div>⌘K to toggle</div>
        </div>
      </div>
    </Modal>
  );
}
