-- Add API key field to profiles table
ALTER TABLE public.profiles ADD COLUMN api_key TEXT UNIQUE;

-- Create function to generate random API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_prefix TEXT := 'whatsapp_';
  random_part TEXT;
  full_key TEXT;
BEGIN
  -- Generate random 32 character string
  SELECT array_to_string(ARRAY(SELECT substr('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', ceil(random()*62)::integer, 1) FROM generate_series(1, 32)), '') INTO random_part;
  
  -- Combine prefix with random part
  full_key := key_prefix || random_part;
  
  RETURN full_key;
END;
$$;

-- Create function to generate and update user API key
CREATE OR REPLACE FUNCTION public.regenerate_user_api_key(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key TEXT;
BEGIN
  -- Generate new API key
  new_key := generate_api_key();
  
  -- Update user's API key
  UPDATE public.profiles 
  SET api_key = new_key, updated_at = now()
  WHERE user_id = user_uuid;
  
  RETURN new_key;
END;
$$;

-- Trigger function to generate API key for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_api_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set API key if not already set
  IF NEW.api_key IS NULL THEN
    NEW.api_key := generate_api_key();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate API key for new profiles
CREATE TRIGGER on_profile_created_generate_api_key
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_api_key();

-- Generate API keys for existing users who don't have one
UPDATE public.profiles 
SET api_key = generate_api_key(), updated_at = now()
WHERE api_key IS NULL;