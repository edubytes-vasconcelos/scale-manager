-- WhatsApp OTP authentication support

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Normalize phone helper (digits only)
CREATE OR REPLACE FUNCTION normalize_phone(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(input, ''), '\D', '', 'g');
$$;

-- Volunteers email becomes optional to support WhatsApp auth
ALTER TABLE volunteers
  ALTER COLUMN email DROP NOT NULL;

-- OTP table
CREATE TABLE IF NOT EXISTS whatsapp_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  code_hash text NOT NULL,
  code_salt text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_otp_phone_idx
  ON whatsapp_otp (phone_normalized);

-- Mapping phone -> auth user
CREATE TABLE IF NOT EXISTS whatsapp_auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  auth_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_auth_users_phone_key
  ON whatsapp_auth_users (phone_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_auth_users_user_key
  ON whatsapp_auth_users (auth_user_id);

ALTER TABLE whatsapp_auth_users
  ADD CONSTRAINT whatsapp_auth_users_user_fk
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Link volunteer profile by phone (used by OTP flow)
CREATE OR REPLACE FUNCTION link_volunteer_by_phone(p_phone text, p_auth_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE volunteers
  SET auth_user_id = p_auth_user_id
  WHERE auth_user_id IS NULL
    AND normalize_phone(whatsapp) = normalize_phone(p_phone);
$$;

GRANT EXECUTE ON FUNCTION link_volunteer_by_phone(text, uuid) TO authenticated;

-- Prevent reads/writes from client role; edge function uses service role
ALTER TABLE whatsapp_otp ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_auth_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_otp_no_access
  ON whatsapp_otp
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY whatsapp_auth_users_no_access
  ON whatsapp_auth_users
  FOR ALL
  USING (false)
  WITH CHECK (false);
