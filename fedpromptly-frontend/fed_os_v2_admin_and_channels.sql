-- ============================================================================
-- FED-OS v2 — ADMIN FLAG FIX + NEW CONTENT CHANNELS
-- Run this in Supabase SQL Editor AFTER (or alongside) fed_os_upgrade_v1.sql
-- Fixes: "I don't have the ability to post guides, notes, questions, announcements"
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. PROMOTE YOUR ACCOUNT TO ADMIN
-- The Notes + Announcements channel pills are gated on profiles.is_admin.
-- This marks your account as admin (replace the username if yours differs).
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.profiles
SET is_admin = true
WHERE lower(trim(username)) IN ('admin', 'fedpromptly', 'fed_os', 'fedos');

-- Optional: verify it worked (should return your row with is_admin = true)
SELECT id, username, is_admin
FROM public.profiles
WHERE is_admin = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. BACKFILL: MOVE EXISTING GENERAL POSTS INTO THE NEW CHANNELS
-- v2 adds three real channels — announcements, guides, questions.
-- These statements move your existing general posts into the proper channel
-- based on the same heuristics the frontend used to classify them.
-- Review the titles listed in each UPDATE before running (they are broad).
-- ────────────────────────────────────────────────────────────────────────────

-- Announcements: "milestone", "launch", "officially", "update", "welcome" posts
UPDATE public.topics
SET channel = 'announcements'
WHERE (channel IS NULL OR channel = 'general')
  AND (lower(title) ~ '(milestone|launch|officially|announce|announcement|update|v[0-9] release)'
    OR lower(content) ~ '(officially|we are excited|milestone)');

-- Guides: "how to", "guide", "tutorial", "comprehensive guide", "journey"
UPDATE public.topics
SET channel = 'guides'
WHERE (channel IS NULL OR channel = 'general')
  AND (lower(title) ~ '(guide|tutorial|how to|journey|walkthrough|step[- ]by[- ]step)'
    OR lower(content) ~ '(step[- ]by[- ]step|in this guide|here.s how)');

-- Questions: posts that actually ask the community something
UPDATE public.topics
SET channel = 'questions'
WHERE (channel IS NULL OR channel = 'general')
  AND lower(title) ~ '\?'
  AND lower(title) ~ '(how|what|why|when|where|which|anyone|is there)';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. SAFETY NOTES
-- ────────────────────────────────────────────────────────────────────────────
-- • Everything here is reversible: set channel = 'general' to undo a move.
-- • No schema change is required for the new channels — topics.channel is a
--   free text column, so 'announcements' | 'guides' | 'questions' work as-is.
-- • After running, hard-refresh (Ctrl+Shift+R) the forum and log out/in so the
--   admin flag is re-read and the Notes + Announcements pills unlock.
-- • If your username is something else entirely, just run:
--     UPDATE public.profiles SET is_admin = true WHERE username = 'YOUR_NAME';
-- ────────────────────────────────────────────────────────────────────────────
