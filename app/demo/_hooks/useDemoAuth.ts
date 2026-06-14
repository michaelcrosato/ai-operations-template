/**
 * F-0029: Centralized authorization hook for the demo canvas.
 *
 * Replaces the inline `canEdit`/`canIntervene`/`rejectViewerEdit` declarations
 * that were duplicated across page.tsx. Single source of truth for persona-based
 * permission decisions in the demo; all mutation controls consume this hook.
 *
 * Pure functions (canEdit, canIntervene) come from lib/seed.ts so the underlying
 * predicate logic remains testable at the unit level there.
 */

import { toast } from 'sonner';
import {
  canIntervene as seedCanIntervene,
  canEdit as seedCanEdit,
} from '@/lib/seed';

export type DemoPersona = 'owner' | 'admin' | 'editor' | 'viewer';

export interface DemoAuth {
  /** viewer → false; owner/admin/editor → true */
  canEdit: boolean;
  /** viewer → false; owner/admin/editor → true (same predicate as canEdit in this demo) */
  canIntervene: boolean;
  /**
   * Show a toast and return true when the persona is a viewer (so call-sites can
   * early-return after calling this).  Returns false when the persona CAN edit —
   * meaning the caller should proceed.
   */
  rejectViewerEdit: (action?: string) => boolean;
}

/**
 * Returns the three permission flags used by every mutation control in
 * app/demo/page.tsx.  Centralizes all RBAC decisions so they are defined once
 * and consumed by panels without scattering inline logic.
 */
export function useDemoAuth(persona: DemoPersona): DemoAuth {
  const canEdit = seedCanEdit(persona);
  const canIntervene = seedCanIntervene(persona);

  /**
   * Emits a read-only toast and returns `true` when the current persona is a
   * viewer (i.e. the caller should abort).  Returns `false` when the persona
   * can edit (the caller should proceed).
   */
  function rejectViewerEdit(action = 'edit the graph'): boolean {
    if (!canEdit) {
      toast.error(`Read-only: viewers cannot ${action}`);
      return true; // caller should early-return
    }
    return false; // caller should proceed
  }

  return { canEdit, canIntervene, rejectViewerEdit };
}
