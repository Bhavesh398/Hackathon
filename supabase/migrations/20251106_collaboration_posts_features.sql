-- Migration: Collaboration posts interactive features
-- Creates tables and helper RPCs for likes, comments, bookmarks and applications
-- Safe to run multiple times (uses IF NOT EXISTS where possible)

/* Extensions */
CREATE EXTENSION IF NOT EXISTS pgcrypto;

/* collaboration_posts - ensure exists (if you already have it, this will not overwrite columns) */
CREATE TABLE IF NOT EXISTS public.collaboration_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  skills_needed text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'collaboration_posts_set_timestamp') THEN
    CREATE TRIGGER collaboration_posts_set_timestamp
    BEFORE UPDATE ON public.collaboration_posts
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
  END IF;
END$$;

/* Likes */
CREATE TABLE IF NOT EXISTS public.collaboration_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

/* Comments */
CREATE TABLE IF NOT EXISTS public.collaboration_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

/* Bookmarks */
CREATE TABLE IF NOT EXISTS public.collaboration_post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

/* Applications */
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE public.application_status AS ENUM ('pending','accepted','rejected');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.collaboration_post_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status public.application_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

/* Indexes to speed up lookups */
CREATE INDEX IF NOT EXISTS idx_collab_posts_user ON public.collaboration_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_posts_created ON public.collaboration_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_likes_post ON public.collaboration_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_collab_comments_post ON public.collaboration_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_collab_bookmarks_user ON public.collaboration_post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_applications_post ON public.collaboration_post_applications(post_id);

/* Row Level Security: enable and minimal policies for authenticated users */
ALTER TABLE public.collaboration_posts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'collab_posts_select' AND polrelid = 'public.collaboration_posts'::regclass) THEN
    EXECUTE 'CREATE POLICY "collab_posts_select" ON public.collaboration_posts FOR SELECT USING (is_active = true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'collab_posts_insert' AND polrelid = 'public.collaboration_posts'::regclass) THEN
    EXECUTE 'CREATE POLICY "collab_posts_insert" ON public.collaboration_posts FOR INSERT WITH CHECK (auth.uid()::uuid = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'collab_posts_update' AND polrelid = 'public.collaboration_posts'::regclass) THEN
    EXECUTE 'CREATE POLICY "collab_posts_update" ON public.collaboration_posts FOR UPDATE USING (auth.uid()::uuid = user_id) WITH CHECK (auth.uid()::uuid = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'collab_posts_delete' AND polrelid = 'public.collaboration_posts'::regclass) THEN
    EXECUTE 'CREATE POLICY "collab_posts_delete" ON public.collaboration_posts FOR DELETE USING (auth.uid()::uuid = user_id)';
  END IF;
END$$;

-- Likes policies
ALTER TABLE public.collaboration_post_likes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'likes_select' AND polrelid = 'public.collaboration_post_likes'::regclass) THEN
    EXECUTE 'CREATE POLICY "likes_select" ON public.collaboration_post_likes FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'likes_insert' AND polrelid = 'public.collaboration_post_likes'::regclass) THEN
    EXECUTE 'CREATE POLICY "likes_insert" ON public.collaboration_post_likes FOR INSERT WITH CHECK (auth.uid()::uuid = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'likes_delete' AND polrelid = 'public.collaboration_post_likes'::regclass) THEN
    EXECUTE 'CREATE POLICY "likes_delete" ON public.collaboration_post_likes FOR DELETE USING (auth.uid()::uuid = user_id)';
  END IF;
END$$;

-- Comments policies
ALTER TABLE public.collaboration_post_comments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'comments_select' AND polrelid = 'public.collaboration_post_comments'::regclass) THEN
    EXECUTE 'CREATE POLICY "comments_select" ON public.collaboration_post_comments FOR SELECT USING (is_deleted = false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'comments_insert' AND polrelid = 'public.collaboration_post_comments'::regclass) THEN
    EXECUTE 'CREATE POLICY "comments_insert" ON public.collaboration_post_comments FOR INSERT WITH CHECK (auth.uid()::uuid = user_id)';
  END IF;
  -- allow comment owner or post owner to delete (soft-delete)
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'comments_delete' AND polrelid = 'public.collaboration_post_comments'::regclass) THEN
    EXECUTE 'CREATE POLICY "comments_delete" ON public.collaboration_post_comments FOR UPDATE USING (auth.uid()::uuid = user_id OR auth.uid()::uuid = (SELECT user_id FROM public.collaboration_posts WHERE id = post_id))';
  END IF;
END$$;

-- Bookmarks policies
ALTER TABLE public.collaboration_post_bookmarks ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'bookmarks_select' AND polrelid = 'public.collaboration_post_bookmarks'::regclass) THEN
    EXECUTE 'CREATE POLICY "bookmarks_select" ON public.collaboration_post_bookmarks FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'bookmarks_insert' AND polrelid = 'public.collaboration_post_bookmarks'::regclass) THEN
    EXECUTE 'CREATE POLICY "bookmarks_insert" ON public.collaboration_post_bookmarks FOR INSERT WITH CHECK (auth.uid()::uuid = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'bookmarks_delete' AND polrelid = 'public.collaboration_post_bookmarks'::regclass) THEN
    EXECUTE 'CREATE POLICY "bookmarks_delete" ON public.collaboration_post_bookmarks FOR DELETE USING (auth.uid()::uuid = user_id)';
  END IF;
END$$;

-- Applications policies
ALTER TABLE public.collaboration_post_applications ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'applications_select' AND polrelid = 'public.collaboration_post_applications'::regclass) THEN
    EXECUTE 'CREATE POLICY "applications_select" ON public.collaboration_post_applications FOR SELECT USING (auth.uid()::uuid = user_id OR auth.uid()::uuid = (SELECT user_id FROM public.collaboration_posts WHERE id = post_id))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'applications_insert' AND polrelid = 'public.collaboration_post_applications'::regclass) THEN
    EXECUTE 'CREATE POLICY "applications_insert" ON public.collaboration_post_applications FOR INSERT WITH CHECK (auth.uid()::uuid = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'applications_update' AND polrelid = 'public.collaboration_post_applications'::regclass) THEN
    EXECUTE 'CREATE POLICY "applications_update" ON public.collaboration_post_applications FOR UPDATE USING (auth.uid()::uuid = user_id OR auth.uid()::uuid = (SELECT user_id FROM public.collaboration_posts WHERE id = post_id))';
  END IF;
END$$;

/* Helper RPCs: toggle like, add comment, toggle bookmark, apply to post */
CREATE OR REPLACE FUNCTION public.toggle_collab_like(p_post_id uuid)
RETURNS TABLE(post_id uuid, user_id uuid, liked boolean) AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.collaboration_post_likes WHERE post_id = p_post_id AND user_id = auth.uid()::uuid) THEN
    DELETE FROM public.collaboration_post_likes WHERE post_id = p_post_id AND user_id = auth.uid()::uuid;
    RETURN QUERY SELECT p_post_id, auth.uid()::uuid, false;
  ELSE
    INSERT INTO public.collaboration_post_likes (post_id, user_id) VALUES (p_post_id, auth.uid()::uuid);
    RETURN QUERY SELECT p_post_id, auth.uid()::uuid, true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_collab_comment(p_post_id uuid, p_body text)
RETURNS TABLE(id uuid, post_id uuid, user_id uuid, body text, created_at timestamptz) AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.collaboration_post_comments(id, post_id, user_id, body)
  VALUES (v_id, p_post_id, auth.uid()::uuid, p_body);
  RETURN QUERY SELECT id, post_id, user_id, body, created_at FROM public.collaboration_post_comments WHERE id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.toggle_collab_bookmark(p_post_id uuid)
RETURNS TABLE(post_id uuid, user_id uuid, bookmarked boolean) AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.collaboration_post_bookmarks WHERE post_id = p_post_id AND user_id = auth.uid()::uuid) THEN
    DELETE FROM public.collaboration_post_bookmarks WHERE post_id = p_post_id AND user_id = auth.uid()::uuid;
    RETURN QUERY SELECT p_post_id, auth.uid()::uuid, false;
  ELSE
    INSERT INTO public.collaboration_post_bookmarks (post_id, user_id) VALUES (p_post_id, auth.uid()::uuid);
    RETURN QUERY SELECT p_post_id, auth.uid()::uuid, true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.apply_to_collab_post(p_post_id uuid, p_message text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid, post_id uuid, user_id uuid, message text, metadata jsonb, status public.application_status, created_at timestamptz) AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.collaboration_post_applications(id, post_id, user_id, message, metadata)
  VALUES (v_id, p_post_id, auth.uid()::uuid, p_message, p_metadata);
  RETURN QUERY SELECT id, post_id, user_id, message, metadata, status, created_at FROM public.collaboration_post_applications WHERE id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/* Grant usage on functions to authenticated role */
GRANT EXECUTE ON FUNCTION public.toggle_collab_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_collab_comment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_collab_bookmark(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_to_collab_post(uuid, text, jsonb) TO authenticated;

-- End migration
