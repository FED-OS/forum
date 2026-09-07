-- ═══════════════════════════════════════════════════════════════════════════
-- FEDPromptly · FED Hub — Supabase Migration v1 (fed_os_upgrade_v1.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Enables: like/vote system, edit & delete for topics/replies (owner-or-admin),
--          (edited) badges, full-text search index, admin helper.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste this entire file → Run.
--   The script is IDEMPOTENT: safe to re-run any time (uses IF NOT EXISTS /
--   IF EXISTS + CREATE OR REPLACE everywhere). No data is lost.
--
-- COMPATIBILITY NOTE
--   The upgraded index.html works BOTH before and after this migration:
--   it probes for the new columns and silently falls back to legacy mode.
--   Features unlocked only after this migration runs:
--     • like/vote buttons   (topic_likes + toggle_topic_like + get_my_likes)
--     • Edit / Delete buttons for your own topics & replies (admin can edit all)
--     • "(edited)" badges    (updated_at columns)
--     • faster search        (GIN full-text index)
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════

-- topics.updated_at — set ONLY by the edit form (no DB trigger, on purpose:
-- a trigger would also fire when like_count changes and every liked topic
-- would falsely show "(edited)").
ALTER TABLE public.topics
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NULL;

ALTER TABLE public.replies
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NULL;

-- topics.like_count — maintained atomically by toggle_topic_like()
ALTER TABLE public.topics
    ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

-- Backfill: make sure existing rows agree with the table default
-- (the exact like-count reconciliation runs AFTER topic_likes is created, §2)
UPDATE public.topics SET like_count = 0 WHERE like_count IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. topic_likes TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.topic_likes (
    topic_id   uuid        NOT NULL REFERENCES public.topics (id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES auth.users   (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (topic_id, user_id)          -- one like per user per topic
);

CREATE INDEX IF NOT EXISTS idx_topic_likes_topic_id ON public.topic_likes (topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_likes_user_id  ON public.topic_likes (user_id);

ALTER TABLE public.topic_likes ENABLE ROW LEVEL SECURITY;

-- Everyone signed-in (and anon) may READ who liked what (needed for counts UI)
DROP POLICY IF EXISTS "fed_topic_likes_select" ON public.topic_likes;
CREATE POLICY "fed_topic_likes_select"
    ON public.topic_likes FOR SELECT
    TO authenticated, anon
    USING (true);

-- A user may only insert THEIR OWN like
DROP POLICY IF EXISTS "fed_topic_likes_insert_own" ON public.topic_likes;
CREATE POLICY "fed_topic_likes_insert_own"
    ON public.topic_likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- A user may only delete THEIR OWN like
DROP POLICY IF EXISTS "fed_topic_likes_delete_own" ON public.topic_likes;
CREATE POLICY "fed_topic_likes_delete_own"
    ON public.topic_likes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- (INSERT/DELETE via the toggle RPC bypass RLS safely as SECURITY DEFINER)

-- Reconcile topics.like_count with actual rows in topic_likes
-- (safe on first run AND on re-runs; no-op once counts already agree)
UPDATE public.topics t
   SET like_count = coalesce(lc.n, 0)
  FROM (SELECT topic_id, count(*) AS n FROM public.topic_likes GROUP BY topic_id) lc
 WHERE t.id = lc.topic_id
   AND t.like_count IS DISTINCT FROM lc.n;

UPDATE public.topics t
   SET like_count = 0
 WHERE NOT EXISTS (SELECT 1 FROM public.topic_likes l WHERE l.topic_id = t.id)
   AND t.like_count IS DISTINCT FROM 0;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. is_admin() HELPER  (security definer — safe against RLS recursion)
--    Uses the existing profiles.is_admin boolean your frontend already reads.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()),
        false
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. toggle_topic_like(p_topic_id)  — the RPC the heart buttons call
--    • atomic like/unlike toggle
--    • keeps topics.like_count in sync
--    • returns the new like_count (a plain number — index.html accepts number
--      or {like_count}; number is what this returns)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.toggle_topic_like(p_topic_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user  uuid := auth.uid();
    v_count integer;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to like topics';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.topics t WHERE t.id = p_topic_id) THEN
        RAISE EXCEPTION 'Topic not found';
    END IF;

    -- Try to unlike first
    DELETE FROM public.topic_likes
     WHERE topic_id = p_topic_id AND user_id = v_user;

    IF NOT FOUND THEN
        -- Wasn't liked → like it now (ON CONFLICT guards double-click races)
        INSERT INTO public.topic_likes (topic_id, user_id)
        VALUES (p_topic_id, v_user)
        ON CONFLICT (topic_id, user_id) DO NOTHING;
    END IF;

    -- Recompute the authoritative count and return it
    UPDATE public.topics t
       SET like_count = (SELECT count(*) FROM public.topic_likes l
                          WHERE l.topic_id = t.id)
     WHERE t.id = p_topic_id
    RETURNING t.like_count INTO v_count;

    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_topic_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_topic_like(uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. get_my_likes()  — probe RPC: "which topics did I like?"
--    Returns rows shaped { topic_id, created_at } — index.html maps r.topic_id.
--    Also doubles as the frontend's "is the like system installed?" probe.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_likes()
RETURNS TABLE (topic_id uuid, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT l.topic_id, l.created_at
      FROM public.topic_likes l
     WHERE l.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_likes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_likes() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. EDIT / DELETE POLICIES  (owner-or-admin)
--    Names are prefixed "fed_" so they never collide with your existing
--    policies; DROP IF EXISTS makes re-runs safe.
-- ═══════════════════════════════════════════════════════════════════════════

-- topics: UPDATE (edit)
DROP POLICY IF EXISTS "fed_topics_update_own_or_admin" ON public.topics;
CREATE POLICY "fed_topics_update_own_or_admin"
    ON public.topics FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- topics: DELETE
DROP POLICY IF EXISTS "fed_topics_delete_own_or_admin" ON public.topics;
CREATE POLICY "fed_topics_delete_own_or_admin"
    ON public.topics FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- replies: UPDATE (edit)
DROP POLICY IF EXISTS "fed_replies_update_own_or_admin" ON public.replies;
CREATE POLICY "fed_replies_update_own_or_admin"
    ON public.replies FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- replies: DELETE
DROP POLICY IF EXISTS "fed_replies_delete_own_or_admin" ON public.replies;
CREATE POLICY "fed_replies_delete_own_or_admin"
    ON public.replies FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- NOTE: view counters are unaffected — they go through your existing
-- increment_forum_views / increment_topic_views RPCs, which are SECURITY
-- DEFINER and bypass these policies by design.


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SEARCH & SORT INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Full-text search across title + content
CREATE INDEX IF NOT EXISTS idx_topics_fts
    ON public.topics
    USING gin (to_tsvector('english',
        coalesce(title, '') || ' ' || coalesce(content, '')));

-- Channel browsing (the channel pills filter + created_at ordering)
CREATE INDEX IF NOT EXISTS idx_topics_channel_created
    ON public.topics (channel, created_at DESC);

-- Newest-first feed pagination
CREATE INDEX IF NOT EXISTS idx_topics_created_desc
    ON public.topics (created_at DESC);

-- Replies list inside a topic detail view
CREATE INDEX IF NOT EXISTS idx_replies_topic_created
    ON public.replies (topic_id, created_at ASC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. REALTIME  (likes appear live for everyone)
--    The frontend already subscribes to public.topics UPDATE events; the
--    toggle RPC's UPDATE of like_count will therefore stream to all clients.
--    Only run the ADD TABLE line if topics isn't already in the publication
--    (it re-runs safely because duplicate additions are skipped).
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public' AND tablename = 'topic_likes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.topic_likes;
    END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. VERIFICATION  (run these one-offs in SQL Editor after this migration)
-- ═══════════════════════════════════════════════════════════════════════════
--
--  a) Columns exist?
--       SELECT column_name FROM information_schema.columns
--        WHERE table_name = 'topics'
--          AND column_name IN ('updated_at', 'like_count');
--       -- expect 2 rows
--
--  b) RPCs exist and are executable?
--       SELECT proname, proconfig FROM pg_proc
--        WHERE pronamespace = 'public'::regnamespace
--          AND proname IN ('toggle_topic_like', 'get_my_likes', 'is_admin');
--       -- expect 3 rows
--
--  c) Policies installed?
--       SELECT tablename, policyname FROM pg_policies
--        WHERE schemaname = 'public'
--          AND policyname LIKE 'fed_%';
--       -- expect 6 rows (2 per table: topics / replies / topic_likes)
--
--  d) End-to-end: sign in on the site, click a heart button, then:
--       SELECT id, title, like_count FROM public.topics
--        WHERE like_count > 0 ORDER BY like_count DESC LIMIT 5;
--       -- your liked topic should appear with like_count = 1
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (only if you ever need to undo everything):
--
--   DROP POLICY IF EXISTS "fed_topics_update_own_or_admin"   ON public.topics;
--   DROP POLICY IF EXISTS "fed_topics_delete_own_or_admin"   ON public.topics;
--   DROP POLICY IF EXISTS "fed_replies_update_own_or_admin"  ON public.replies;
--   DROP POLICY IF EXISTS "fed_replies_delete_own_or_admin"  ON public.replies;
--   DROP POLICY IF EXISTS "fed_topic_likes_select"           ON public.topic_likes;
--   DROP POLICY IF EXISTS "fed_topic_likes_insert_own"       ON public.topic_likes;
--   DROP POLICY IF EXISTS "fed_topic_likes_delete_own"       ON public.topic_likes;
--   DROP FUNCTION IF EXISTS public.toggle_topic_like(uuid);
--   DROP FUNCTION IF EXISTS public.get_my_likes();
--   DROP FUNCTION IF EXISTS public.is_admin();
--   DROP TABLE IF EXISTS public.topic_likes;
--   ALTER TABLE public.topics  DROP COLUMN IF EXISTS like_count;
--   ALTER TABLE public.topics  DROP COLUMN IF EXISTS updated_at;
--   ALTER TABLE public.replies DROP COLUMN IF EXISTS updated_at;
--   DROP INDEX IF EXISTS idx_topics_fts;
--   DROP INDEX IF EXISTS idx_topics_channel_created;
--   DROP INDEX IF EXISTS idx_topics_created_desc;
--   DROP INDEX IF EXISTS idx_replies_topic_created;
--   (index.html auto-detects the missing columns and returns to legacy mode)
-- ═══════════════════════════════════════════════════════════════════════════
