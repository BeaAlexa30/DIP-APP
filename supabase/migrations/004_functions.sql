-- ============================================================
-- DIP MVP Function: increment_token_response_count
-- Migration: 004_functions.sql
-- 
-- NOTE: This function is no longer called by the app (the app
-- uses /api/survey/increment-count route instead), but it is
-- included here for completeness and for any direct DB use.
-- ============================================================

CREATE OR REPLACE FUNCTION increment_token_response_count(token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE survey_tokens
  SET response_count = response_count + 1
  WHERE id = token_id;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION increment_token_response_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION increment_token_response_count(uuid) TO authenticated;
