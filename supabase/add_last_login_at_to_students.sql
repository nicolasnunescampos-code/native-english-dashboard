-- Add last_login_at column to public.students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Backfill last_login_at from auth.users if available
DO $$
BEGIN
  UPDATE public.students s
  SET last_login_at = u.last_sign_in_at
  FROM auth.users u
  WHERE s.id = u.id AND u.last_sign_in_at IS NOT NULL AND s.last_login_at IS NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Automatically sync last_login_at whenever a user signs into Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_user_login_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL THEN
    UPDATE public.students
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_login_sync ON auth.users;
CREATE TRIGGER on_auth_user_login_sync
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login_sync();
