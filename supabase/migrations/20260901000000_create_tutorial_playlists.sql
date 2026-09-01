-- ============================================
-- 1. CREATE: tutorial_playlists table
-- ============================================
CREATE TABLE IF NOT EXISTS public.tutorial_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    level TEXT DEFAULT 'Beginner',
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tutorial_playlists_category ON public.tutorial_playlists(category);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlists_published ON public.tutorial_playlists(is_published);

-- Enable RLS
ALTER TABLE public.tutorial_playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage playlists" ON public.tutorial_playlists
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view published playlists" ON public.tutorial_playlists
    FOR SELECT USING (is_published = true);

-- ============================================
-- 2. CREATE: tutorial_playlist_videos (Join Table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tutorial_playlist_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.tutorial_playlists(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.tutorials(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_tutorial_playlist_videos_playlist ON public.tutorial_playlist_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlist_videos_video ON public.tutorial_playlist_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlist_videos_sort ON public.tutorial_playlist_videos(sort_order);

-- Enable RLS
ALTER TABLE public.tutorial_playlist_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage playlist videos" ON public.tutorial_playlist_videos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view playlist videos" ON public.tutorial_playlist_videos
    FOR SELECT USING (true);

-- ============================================
-- 3. UPDATE: tutorials table content_type
-- ============================================
ALTER TABLE public.tutorials
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'tutorial';

ALTER TABLE public.tutorials
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_tutorials_content_type ON public.tutorials(content_type);

UPDATE public.tutorials SET content_type = 'tutorial' WHERE content_type IS NULL;
