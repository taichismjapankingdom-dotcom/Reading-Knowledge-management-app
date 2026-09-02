-- ==============================================================================
-- PREMIUM FEATURES SCHEMA MIGRATION
-- Please run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  provider TEXT, -- e.g., 'stripe', 'apple', 'google', 'mock'
  provider_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'free', -- 'free', 'trialing', 'active', 'past_due', 'canceled', 'expired'
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view their own subscription" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- Only service role (backend webhooks) can insert/update/delete subscriptions
-- No public policies for INSERT/UPDATE/DELETE are created here.


-- 2. USAGE METRICS TABLE
CREATE TABLE IF NOT EXISTS public.usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  feature TEXT NOT NULL, 
  model TEXT, -- For AI cost tracking
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT DEFAULT 0,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  UNIQUE(user_id, feature, day)
);

-- Enable RLS for usage_daily
ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can view their own usage" 
  ON public.usage_daily FOR SELECT 
  USING (auth.uid() = user_id);

-- Backend (Edge Functions) handles insertions/updates, so no public write policies.


-- 3. QUIZ TABLES
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  question_count INT,
  score INT,
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

-- Enable RLS
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz sessions" 
  ON public.quiz_sessions FOR SELECT 
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own quiz sessions" 
  ON public.quiz_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own quiz sessions" 
  ON public.quiz_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz sessions" 
  ON public.quiz_sessions FOR DELETE 
  USING (auth.uid() = user_id);

-- quiz_questions policies (derive access from session)
CREATE POLICY "Users can view their own quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));

CREATE POLICY "Users can insert their own quiz questions"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions qs WHERE qs.id = session_id AND qs.user_id = auth.uid()));


-- 4. USER MEDIA TABLE (YouTube/Spotify)
CREATE TABLE IF NOT EXISTS public.user_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  provider TEXT NOT NULL, 
  external_id TEXT,
  url TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own media" 
  ON public.user_media FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 5. BOOKS TABLE EXTENSIONS
-- Add synopsis fields safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='books' AND column_name='synopsis') THEN
    ALTER TABLE public.books ADD COLUMN synopsis TEXT;
    ALTER TABLE public.books ADD COLUMN synopsis_source TEXT;
    ALTER TABLE public.books ADD COLUMN synopsis_generated_at TIMESTAMPTZ;
    ALTER TABLE public.books ADD COLUMN synopsis_language TEXT;
    ALTER TABLE public.books ADD COLUMN synopsis_model TEXT;
    ALTER TABLE public.books ADD COLUMN synopsis_source_url TEXT;
  END IF;
END
$$;
