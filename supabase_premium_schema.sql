-- ==============================================================================
-- PREMIUM FEATURES SCHEMA MIGRATION (Phase 0 - Hardened)
-- Please run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  provider TEXT, -- e.g., 'stripe', 'apple', 'google'
  provider_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'free', -- 'free', 'trialing', 'active', 'past_due', 'canceled', 'expired'
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);
-- No public policies for INSERT/UPDATE/DELETE (reserved for backend webhooks)


-- 2. USAGE METRICS TABLE
CREATE TABLE IF NOT EXISTS public.usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, 
  model TEXT NOT NULL DEFAULT 'none', -- Supports distinguished AI models or 'none' for basic features
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT DEFAULT 0 CHECK (count >= 0),
  tokens_input INT DEFAULT 0 CHECK (tokens_input >= 0),
  tokens_output INT DEFAULT 0 CHECK (tokens_output >= 0),
  UNIQUE(user_id, feature, model, day)
);

ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_daily;
CREATE POLICY "Users can view their own usage" 
  ON public.usage_daily FOR SELECT 
  USING (auth.uid() = user_id);
-- Backend (Edge Functions) handles insertions/updates, so no public write policies.


-- 3. QUIZ TABLES
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  question_count INT CHECK (question_count >= 0),
  score INT CHECK (score >= 0),
  mode TEXT
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  type TEXT,
  question TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  source_reference TEXT
);

-- Enable RLS and setup idempotent policies
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- quiz_sessions policies
DROP POLICY IF EXISTS "Users can view their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can view their own quiz sessions" 
  ON public.quiz_sessions FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can insert their own quiz sessions" 
  ON public.quiz_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can update their own quiz sessions" 
  ON public.quiz_sessions FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can delete their own quiz sessions" 
  ON public.quiz_sessions FOR DELETE 
  USING (auth.uid() = user_id);

-- quiz_questions policies (derive access from session)
DROP POLICY IF EXISTS "Users can view their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can view their own quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can insert their own quiz questions"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can update their own quiz questions"
  ON public.quiz_questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can delete their own quiz questions"
  ON public.quiz_questions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));


-- 4. USER MEDIA TABLE (YouTube/Spotify)
CREATE TABLE IF NOT EXISTS public.user_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, 
  external_id TEXT,
  url TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own media" ON public.user_media;
CREATE POLICY "Users can manage their own media" 
  ON public.user_media FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 5. BOOKS TABLE EXTENSIONS
-- Add synopsis fields safely (Idempotent single ADD COLUMN statements)
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS synopsis TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_source TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS synopsis_language TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_model TEXT,
    ADD COLUMN IF NOT EXISTS synopsis_source_url TEXT;
