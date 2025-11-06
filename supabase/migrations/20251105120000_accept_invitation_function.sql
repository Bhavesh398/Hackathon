-- Migration: create security-definer function to accept invitation by token

-- This function will:
-- 1. Lookup invitation by token
-- 2. Verify the invitation is pending and the invited_email matches the user's email
-- 3. Mark invitation as accepted and insert event_roles if not already present
-- SECURITY DEFINER so it can bypass RLS safely for this controlled operation

-- If an older function exists with a different return signature, drop it first
-- This avoids errors when changing the function's OUT parameters / return type
DROP FUNCTION IF EXISTS public.accept_invitation_by_token(text, uuid);

CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(
  _token text,
  _user_id uuid
)
RETURNS TABLE(success boolean, message text, event_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  inv record;
  user_email text;
BEGIN
  SELECT * INTO inv FROM public.event_invitations WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invitation not found', NULL::uuid;
    RETURN;
  END IF;

  IF inv.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'Invitation not pending', NULL::uuid;
    RETURN;
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
  IF user_email IS NULL THEN
    RETURN QUERY SELECT false, 'Unable to resolve user email', NULL::uuid;
    RETURN;
  END IF;

  IF inv.invited_email IS DISTINCT FROM user_email THEN
    RETURN QUERY SELECT false, 'Invitation email does not match your account', NULL::uuid;
    RETURN;
  END IF;

  -- mark invitation accepted
  UPDATE public.event_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;

  -- insert role if missing
  INSERT INTO public.event_roles (user_id, event_id, role)
  SELECT _user_id, inv.event_id, inv.role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.event_roles WHERE user_id = _user_id AND event_id = inv.event_id AND role = inv.role
  );

  RETURN QUERY SELECT true, 'Invitation accepted', inv.event_id;
END;
$func$;

-- Grant execute to authenticated users so frontend can call the rpc
do $$ begin
  grant execute on function public.accept_invitation_by_token(text, uuid) to authenticated;
exception when others then null;
end $$;
