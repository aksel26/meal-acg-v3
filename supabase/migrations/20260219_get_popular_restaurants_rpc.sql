-- Create restaurant name normalization function
-- Level 2: Remove branch names and normalize spacing
CREATE OR REPLACE FUNCTION normalize_restaurant_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF name IS NULL OR TRIM(name) = '' THEN
    RETURN NULL;
  END IF;

  RETURN TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(TRIM(name)),
            '\s*[\(（].*?[\)）]\s*', '', 'g'  -- Remove (branch name)
          ),
          '\s*[-–—]\s*.*$', ''  -- Remove - branch name
        ),
        '\s+(점|지점|매장|본점)$', ''  -- Remove trailing 점/지점/매장/본점
      ),
      '\s+', ' ', 'g'  -- Normalize multiple spaces to single space
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_restaurant_name(TEXT) IS
'Normalizes restaurant names by:
1. Converting to lowercase
2. Removing parenthetical branch names
3. Removing branch names after hyphens
4. Removing trailing store indicators (점, 지점, 매장, 본점)
5. Normalizing whitespace';

-- Create RPC function to get popular restaurants
-- This function aggregates restaurant visits from meal_logs and returns top N results
-- Performance improvement: DB-level aggregation instead of JavaScript processing

CREATE OR REPLACE FUNCTION get_popular_restaurants(limit_count INT DEFAULT 10)
RETURNS TABLE(name TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH all_stores AS (
    -- Collect all restaurant names from breakfast, lunch, and dinner
    -- Apply normalization to reduce duplicates
    SELECT normalize_restaurant_name(breakfast_store) as store_name
    FROM meal_logs
    WHERE breakfast_store IS NOT NULL
      AND TRIM(breakfast_store) != ''

    UNION ALL

    SELECT normalize_restaurant_name(lunch_store)
    FROM meal_logs
    WHERE lunch_store IS NOT NULL
      AND TRIM(lunch_store) != ''

    UNION ALL

    SELECT normalize_restaurant_name(dinner_store)
    FROM meal_logs
    WHERE dinner_store IS NOT NULL
      AND TRIM(dinner_store) != ''
  )
  SELECT
    store_name::TEXT as name,
    COUNT(*)::BIGINT as count
  FROM all_stores
  WHERE store_name IS NOT NULL  -- Filter out NULL results from normalization
  GROUP BY store_name
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment to explain the function
COMMENT ON FUNCTION get_popular_restaurants(INT) IS
'Aggregates restaurant visits from meal_logs (breakfast, lunch, dinner) and returns top N most popular restaurants.
Uses normalize_restaurant_name() for advanced normalization (lowercase, branch name removal, etc.).';
