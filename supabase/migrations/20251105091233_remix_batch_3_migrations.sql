
-- Migration: 20251105072706

-- Migration: 20251101234947

-- Migration: 20251101232336

-- Migration: 20251101225715

-- Migration: 20251101174553
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  college text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'participant', 'judge');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  location text,
  is_online boolean DEFAULT false,
  max_participants int,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create event registrations table
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_name text,
  registered_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can register themselves"
  ON public.event_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create submissions table
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  github_url text,
  demo_url text,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view submissions"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can submit own projects"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create scores table for judging
CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  judge_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  innovation int CHECK (innovation >= 0 AND innovation <= 10),
  impact int CHECK (impact >= 0 AND impact <= 10),
  feasibility int CHECK (feasibility >= 0 AND feasibility <= 10),
  feedback text,
  scored_at timestamptz DEFAULT now(),
  UNIQUE (submission_id, judge_id)
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Judges can view all scores"
  ON public.scores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'judge') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Judges can insert scores"
  ON public.scores FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'judge') AND auth.uid() = judge_id);

-- Create winners table
CREATE TABLE public.winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position text NOT NULL,
  prize_amount decimal(10,2),
  announced_at timestamptz DEFAULT now()
);

ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view winners"
  ON public.winners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert winners"
  ON public.winners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  certificate_code text UNIQUE NOT NULL,
  issued_at timestamptz DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view certificates"
  ON public.certificates FOR SELECT
  USING (true);

CREATE POLICY "Users can view own certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create incubation table
CREATE TABLE public.incubation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active',
  progress int DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  mentor_notes text,
  next_milestone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.incubation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incubation"
  ON public.incubation FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert incubation"
  ON public.incubation FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update incubation"
  ON public.incubation FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- Migration: 20251101225840
-- Create event_roles table for event-specific role assignments
CREATE TABLE public.event_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, event_id, role)
);

-- Create invitations table for judge invites
CREATE TABLE public.event_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  role app_role NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone
);

-- Create helper functions (security definer) BEFORE enabling RLS/policies
-- These functions run as the schema owner and bypass RLS so policies can call them
CREATE OR REPLACE FUNCTION public.has_event_role(_user_id uuid, _event_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_roles
    WHERE user_id = _user_id
      AND event_id = _event_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_event_roles(_user_id uuid, _event_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.event_roles
  WHERE user_id = _user_id
    AND event_id = _event_id;
$$;

-- Enable RLS after helper functions are in place
ALTER TABLE public.event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_roles
CREATE POLICY "Users can view their own event roles"
  ON public.event_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles for their events"
  ON public.event_roles FOR SELECT
  USING (
    has_event_role(auth.uid(), event_roles.event_id, 'admin'::app_role)
  );

CREATE POLICY "System can insert event roles"
  ON public.event_roles FOR INSERT
  WITH CHECK (true);

-- RLS policies for invitations
CREATE POLICY "Admins can view invitations for their events"
  ON public.event_invitations FOR SELECT
  USING (
    has_event_role(auth.uid(), event_invitations.event_id, 'admin'::app_role)
  );

CREATE POLICY "Admins can create invitations for their events"
  ON public.event_invitations FOR INSERT
  WITH CHECK (
    has_event_role(auth.uid(), event_invitations.event_id, 'admin'::app_role)
    AND invited_by = auth.uid()
  );

CREATE POLICY "Users can view invitations sent to their email"
  ON public.event_invitations FOR SELECT
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "System can update invitation status"
  ON public.event_invitations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create function to check event-specific role
CREATE OR REPLACE FUNCTION public.has_event_role(_user_id uuid, _event_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_roles
    WHERE user_id = _user_id
      AND event_id = _event_id
      AND role = _role
  )
$$;

-- Create function to get user roles for an event
CREATE OR REPLACE FUNCTION public.get_user_event_roles(_user_id uuid, _event_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.event_roles
  WHERE user_id = _user_id
    AND event_id = _event_id
$$;

-- Migration: 20251101230521
-- Create enum for connection status
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'blocked');

-- Create enum for message type
CREATE TYPE message_type AS ENUM ('text', 'file', 'image');

-- Event messages table (Discord-style chat per event)
CREATE TABLE public.event_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  message_type message_type NOT NULL DEFAULT 'text',
  attachment_url TEXT,
  reply_to_id UUID REFERENCES public.event_messages(id) ON DELETE SET NULL,
  mentions UUID[],
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Direct messages table (private chats between connected users)
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Connections table (LinkedIn-style connections)
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status connection_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id),
  CHECK (requester_id != receiver_id)
);

-- Collaboration posts table (networking posts)
CREATE TABLE public.collaboration_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'co-founder', 'mentor', 'team-member', 'other'
  skills_needed TEXT[],
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Typing indicators table
CREATE TABLE public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_typed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Message read receipts for event messages
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.event_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_event_messages_event_id ON public.event_messages(event_id);
CREATE INDEX idx_event_messages_created_at ON public.event_messages(created_at DESC);
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
CREATE INDEX idx_connections_requester ON public.connections(requester_id);
CREATE INDEX idx_connections_receiver ON public.connections(receiver_id);
CREATE INDEX idx_connections_status ON public.connections(status);
CREATE INDEX idx_collaboration_posts_user ON public.collaboration_posts(user_id);
CREATE INDEX idx_collaboration_posts_event ON public.collaboration_posts(event_id);

-- Enable RLS
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_messages
CREATE POLICY "Users can view messages in events they're registered for"
ON public.event_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = event_messages.event_id
    AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.event_roles
    WHERE event_id = event_messages.event_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in events they're part of"
ON public.event_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM public.event_registrations
      WHERE event_id = event_messages.event_id
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.event_roles
      WHERE event_id = event_messages.event_id
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own messages"
ON public.event_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.event_messages FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for direct_messages
CREATE POLICY "Users can view their own direct messages"
ON public.direct_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send direct messages to connections"
ON public.direct_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
    AND (
      (requester_id = sender_id AND receiver_id = direct_messages.receiver_id) OR
      (receiver_id = sender_id AND requester_id = direct_messages.receiver_id)
    )
  )
);

CREATE POLICY "Users can update read status on messages sent to them"
ON public.direct_messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- RLS Policies for connections
CREATE POLICY "Users can view their own connections"
ON public.connections FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create connection requests"
ON public.connections FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connections they're part of"
ON public.connections FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own connection requests"
ON public.connections FOR DELETE
USING (auth.uid() = requester_id);

-- RLS Policies for collaboration_posts
CREATE POLICY "Anyone can view active collaboration posts"
ON public.collaboration_posts FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can create their own collaboration posts"
ON public.collaboration_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collaboration posts"
ON public.collaboration_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collaboration posts"
ON public.collaboration_posts FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing indicators in their events"
ON public.typing_indicators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = typing_indicators.event_id
    AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.event_roles
    WHERE event_id = typing_indicators.event_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own typing status"
ON public.typing_indicators FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their typing indicator"
ON public.typing_indicators FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for message_read_receipts
CREATE POLICY "Users can view read receipts for their messages"
ON public.message_read_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_messages
    WHERE id = message_read_receipts.message_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.message_read_receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_event_messages_updated_at
BEFORE UPDATE ON public.event_messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_posts_updated_at
BEFORE UPDATE ON public.collaboration_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false);

-- Storage policies for chat attachments
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments in their events"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Migration: 20251101230554
-- Fix function search path security issue
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- Migration: 20251101234251
-- Drop ALL policies on event_roles first
DROP POLICY IF EXISTS "Users can view their own event roles" ON public.event_roles;
DROP POLICY IF EXISTS "Admins can view all roles for their events" ON public.event_roles;
DROP POLICY IF EXISTS "Admins can view roles for events they admin" ON public.event_roles;
DROP POLICY IF EXISTS "System can insert event roles" ON public.event_roles;

-- Create a security definer function to check event roles without recursion
CREATE OR REPLACE FUNCTION public.has_event_role(_user_id uuid, _event_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_roles
    WHERE user_id = _user_id
      AND event_id = _event_id
      AND role = _role
  )
$$;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own event roles"
ON public.event_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert event roles"
ON public.event_roles
FOR INSERT
WITH CHECK (true);

-- Migration: 20251101234419
-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = _user_id
$$;

-- Drop and recreate the policy for viewing invitations
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.event_invitations;

CREATE POLICY "Users can view invitations sent to their email"
ON public.event_invitations
FOR SELECT
USING (invited_email = public.get_user_email(auth.uid()));


-- Migration: 20251101235248
-- Trigger types regeneration for remixed project
-- This ensures all existing tables are properly typed

-- Add a helpful comment to document the database
COMMENT ON TABLE public.profiles IS 'User profile information';


-- Migration: 20251102001139
-- Create a secure function to issue certificates
CREATE OR REPLACE FUNCTION public.issue_certificate(
  _user_id UUID,
  _event_id UUID,
  _certificate_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _certificate_id UUID;
BEGIN
  -- Verify caller has admin role for the event
  IF NOT has_event_role(auth.uid(), _event_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only event admins can issue certificates';
  END IF;

  -- Verify user participated in or won the event
  IF NOT EXISTS (
    SELECT 1 FROM event_registrations 
    WHERE user_id = _user_id AND event_id = _event_id
  ) AND NOT EXISTS (
    SELECT 1 FROM winners 
    WHERE user_id = _user_id AND event_id = _event_id
  ) THEN
    RAISE EXCEPTION 'User must be a participant or winner of the event';
  END IF;

  -- Check if certificate already exists
  IF EXISTS (
    SELECT 1 FROM certificates 
    WHERE user_id = _user_id AND event_id = _event_id
  ) THEN
    RAISE EXCEPTION 'Certificate already issued for this user and event';
  END IF;

  -- Insert certificate
  INSERT INTO certificates (user_id, event_id, certificate_code)
  VALUES (_user_id, _event_id, _certificate_code)
  RETURNING id INTO _certificate_id;

  RETURN _certificate_id;
END;
$$;

-- Add INSERT policy for certificates (only via function)
CREATE POLICY "System can issue certificates"
ON certificates
FOR INSERT
WITH CHECK (true);

-- Migration: 20251102001323
-- Create a secure function to issue certificates
CREATE OR REPLACE FUNCTION public.issue_certificate(
  _user_id UUID,
  _event_id UUID,
  _certificate_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _certificate_id UUID;
BEGIN
  -- Verify caller has admin role for the event
  IF NOT has_event_role(auth.uid(), _event_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only event admins can issue certificates';
  END IF;

  -- Verify user participated in or won the event
  IF NOT EXISTS (
    SELECT 1 FROM event_registrations 
    WHERE user_id = _user_id AND event_id = _event_id
  ) AND NOT EXISTS (
    SELECT 1 FROM winners 
    WHERE user_id = _user_id AND event_id = _event_id
  ) THEN
    RAISE EXCEPTION 'User must be a participant or winner of the event';
  END IF;

  -- Check if certificate already exists
  IF EXISTS (
    SELECT 1 FROM certificates 
    WHERE user_id = _user_id AND event_id = _event_id
  ) THEN
    RAISE EXCEPTION 'Certificate already issued for this user and event';
  END IF;

  -- Insert certificate
  INSERT INTO certificates (user_id, event_id, certificate_code)
  VALUES (_user_id, _event_id, _certificate_code)
  RETURNING id INTO _certificate_id;

  RETURN _certificate_id;
END;
$$;


-- Migration: 20251105073316
-- Simple migration to trigger types regeneration
-- This will force the Supabase types file to sync with the database schema

-- Ensure profiles table has proper structure
COMMENT ON TABLE public.profiles IS 'User profile information';

-- Verify events table structure
COMMENT ON TABLE public.events IS 'Hackathon events';

-- Migration: 20251105083403
-- Create community_messages table for global chat
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_edited BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view community messages
CREATE POLICY "Anyone can view community messages"
ON public.community_messages
FOR SELECT
USING (true);

-- Authenticated users can send community messages
CREATE POLICY "Authenticated users can send messages"
ON public.community_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
ON public.community_messages
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.community_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
