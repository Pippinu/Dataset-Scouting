-- Slow Query 2:
EXPLAIN ANALYZE
SELECT c.country, COUNT(r.restaurant_id) AS total_restaurants
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
GROUP BY c.country
ORDER BY total_restaurants DESC;

-- Optimized Query 2

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_country_code ON restaurant_address (country_code);

EXPLAIN ANALYZE
SELECT c.country, COUNT(a.restaurant_id) AS total_restaurants
FROM restaurant_address a
JOIN countries c ON a.country_code = c.country_code
GROUP BY c.country
ORDER BY total_restaurants DESC;

--------------------------------------------------------------------

-- QUERY 4: Find restaurants by cuisine

-- Slow Query 4:
EXPLAIN ANALYZE
SELECT r.restaurant_name, a.city, c.country, r.cuisines
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE r.cuisines ILIKE '%Italian%' OR r.cuisines ILIKE '%Japanese%';


-- Optimized Query 4: (Uses an index on restaurants.cuisines)


-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_cuisines ON restaurants (cuisines);

EXPLAIN ANALYZE
SELECT r.restaurant_name, a.city, c.country, r.cuisines
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE r.cuisines LIKE 'Italian%' OR r.cuisines LIKE 'Japanese%';

--------------------------------------------------------------------

-- Slow Query 6:
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

-- Optimized Query 6: (Uses a materialized view to cache the result)
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

-- Slow Query 8:
SELECT 
    r.restaurant_name, 
    a.city, 
    c.country, 
    co.longitude, 
    co.latitude,
    (POW(co.longitude - (-74.0060), 2) + POW(co.latitude - 40.7128, 2)) AS distance_metric
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
JOIN coordinates co ON r.restaurant_id = co.restaurant_id
WHERE co.longitude BETWEEN -82.5 AND -74.5
  AND co.latitude BETWEEN 33 AND 44
ORDER BY distance_metric ASC
LIMIT 5;


-- Optimized Query 8: (Uses an index on coordinates and a bounding box)

-- First, create an index on the coordinates table for longitude and latitude
CREATE INDEX idx_coordinates ON coordinates (longitude, latitude);

-- Optimized: Find closest restaurants using the bounding box and the index
SELECT 
    r.restaurant_name, 
    a.city, 
    c.country, 
    co.longitude, 
    co.latitude,
    (POW(co.longitude - (-74.0060), 2) + POW(co.latitude - 40.7128, 2)) AS distance_metric
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
JOIN coordinates co ON r.restaurant_id = co.restaurant_id
WHERE co.longitude BETWEEN -82.5 AND -74.5
  AND co.latitude BETWEEN 33 AND 44
ORDER BY distance_metric ASC
LIMIT 5;
