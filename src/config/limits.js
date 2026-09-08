/**
 * Centralized product configuration for Phase 1 Premium Limits.
 * The absolute truth is enforced on the backend via Postgres RLS & RPCs.
 * These frontend constants mirror the backend for UX purposes.
 */
export const PREMIUM_LIMITS = {
  FREE_MAX_BOOKS: 30,
  FREE_MAX_SEARCHES_PER_DAY: 10
};
