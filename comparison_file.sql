-- Query 2 - Slow: Count restaurants per country
EXPLAIN ANALYZE
SELECT c.country, COUNT(r.restaurant_id) AS total_restaurants
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
GROUP BY c.country
ORDER BY total_restaurants DESC;

-- Query 2 - Optimized: Count restaurants per country (Uses index on country_code)
CREATE INDEX IF NOT EXISTS idx_country_code ON restaurant_address (country_code);

EXPLAIN ANALYZE
SELECT c.country, COUNT(a.restaurant_id) AS total_restaurants
FROM restaurant_address a
JOIN countries c ON a.country_code = c.country_code
GROUP BY c.country
ORDER BY total_restaurants DESC;

--------------------------------------------------------------------

-- Query 6 - Slow: Find highest-rated restaurant by aggregate rating
EXPLAIN ANALYZE
WITH max_rating AS (
    SELECT MAX(aggregate_rating) AS max_val FROM rating
)
SELECT c.country, r.restaurant_name, rt.aggregate_rating
FROM restaurants r
JOIN rating rt ON r.restaurant_id = rt.restaurant_id
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE rt.aggregate_rating = (SELECT max_val FROM max_rating)
ORDER BY c.country, r.restaurant_name;

-- Query 6 - Optimized: Find highest-rated restaurant by aggregate rating (Uses materialized view)
DROP MATERIALIZED VIEW IF EXISTS top_rated_restaurants;

CREATE MATERIALIZED VIEW top_rated_restaurants AS
WITH max_rating AS (
    SELECT MAX(aggregate_rating) AS max_val FROM rating
)
SELECT c.country, r.restaurant_name, rt.aggregate_rating
FROM restaurants r
JOIN rating rt ON r.restaurant_id = rt.restaurant_id
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE rt.aggregate_rating = (SELECT max_val FROM max_rating);

EXPLAIN ANALYZE
SELECT * FROM top_rated_restaurants;

--------------------------------------------------------------------

-- Query 4 - Slow: Find restaurants by cuisine
EXPLAIN ANALYZE
SELECT r.restaurant_name, a.city, c.country, r.cuisines
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE r.cuisines ILIKE '%Italian%' OR r.cuisines ILIKE '%Japanese%';
-- Query 4 - Optimized: Find restaurants by cuisine (Uses index on cuisines)

CREATE INDEX IF NOT EXISTS idx_cuisines ON restaurants (cuisines);

EXPLAIN ANALYZE
SELECT r.restaurant_name, a.city, c.country, r.cuisines
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE r.cuisines LIKE 'Italian%' OR r.cuisines LIKE 'Japanese%';


-- ALTERNATIVE OPTIMIZATION for Query 4 (Uses a separate cuisines table and restaurant-cuisines joint table)

-- Create the 'cuisines' table
CREATE TABLE cuisines (
    cuisine_id SERIAL PRIMARY KEY,  -- auto-incrementing ID for each unique cuisine
    cuisine_name TEXT UNIQUE NOT NULL  -- Cuisine name, unique to avoid duplicates
);

-- Insert unique cuisines into the 'cuisines' table from the 'restaurants' table
-- Assuming cuisines are stored as comma-separated values in the 'restaurants' table
-- We split the cuisines and insert only unique ones

INSERT INTO cuisines (cuisine_name)
SELECT DISTINCT unnest(string_to_array(r.cuisines, ',')) AS cuisine_name
FROM restaurants r
WHERE r.cuisines IS NOT NULL;

-- Create the 'restaurant_cuisines' joint table
CREATE TABLE restaurant_cuisines (
    restaurant_id INT,
    cuisine_id INT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cuisine_id) REFERENCES cuisines(cuisine_id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (restaurant_id, cuisine_id)  -- Composite primary key
);

-- Insert data into 'restaurant_cuisines' from the 'restaurants' table
INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id)
SELECT r.restaurant_id, cu.cuisine_id
FROM restaurants r
JOIN cuisines cu ON cu.cuisine_name IN (
    -- Split the comma-separated cuisines and join with 'cuisines' table
    SELECT unnest(string_to_array(r.cuisines, ',')) AS cuisine_name
)
WHERE cu.cuisine_name IS NOT NULL;

-- Let's CHECK RUNTIME
-- Query 4 - Slow: Find restaurants by cuisine
EXPLAIN ANALYZE
SELECT r.restaurant_name, a.city, c.country, r.cuisines
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE r.cuisines ILIKE '%Italian%' OR r.cuisines ILIKE '%Japanese%';


-- Query 4 - Optimized: Find restaurants by cuisine
EXPLAIN ANALYZE
SELECT r.restaurant_name, a.city, c.country, cu.cuisine_name
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
JOIN restaurant_cuisines rc ON r.restaurant_id = rc.restaurant_id
JOIN cuisines cu ON rc.cuisine_id = cu.cuisine_id
WHERE cu.cuisine_name ILIKE 'Italian%' OR cu.cuisine_name ILIKE 'Japanese%';
