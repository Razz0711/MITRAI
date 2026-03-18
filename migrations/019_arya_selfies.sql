-- ============================================
-- 019_arya_selfies.sql
-- Track users who have requested a selfie from Arya
-- to enforce the 1-selfie-per-user limit.
-- ============================================

CREATE TABLE IF NOT EXISTS public.arya_selfies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE public.arya_selfies ENABLE ROW LEVEL SECURITY;

-- Users can read their own selfie record
CREATE POLICY "Users can read their own selfie record"
    ON public.arya_selfies FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert records (Service role bypasses RLS, but we can add an insert policy just in case)
CREATE POLICY "Service role can manage all selfies"
    ON public.arya_selfies FOR ALL
    USING (true)
    WITH CHECK (true);
