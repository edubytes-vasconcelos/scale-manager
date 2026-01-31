-- Normalize phone: strip non-digits and optional leading country code 55

CREATE OR REPLACE FUNCTION normalize_phone(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN regexp_replace(coalesce(input, ''), '\D', '', 'g') LIKE '55%' 
      AND length(regexp_replace(coalesce(input, ''), '\D', '', 'g')) > 11
      THEN substr(regexp_replace(coalesce(input, ''), '\D', '', 'g'), 3)
    ELSE regexp_replace(coalesce(input, ''), '\D', '', 'g')
  END;
$$;

