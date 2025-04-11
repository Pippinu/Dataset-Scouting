-- Query 2 - Optimized: Count the number of restaurants per country)
-- An index on restaurant_address.country_code speeds up the join with countries.
CREATE INDEX IF NOT EXISTS idx_country_code ON restaurant_address (country_code);

SELECT c.country, COUNT(a.restaurant_id) AS total_restaurants
FROM restaurant_address a
JOIN countries c ON a.country_code = c.country_code
GROUP BY c.country
ORDER BY total_restaurants DESC;

-- Query 4 - Optimized: Find restaurants by cuisine
-- An index on the cuisines column improves filtering performance.
CREATE INDEX IF NOT EXISTS idx_cuisines ON restaurants (cuisines);

SELECT r.restaurant_name, a.city, c.country, r.cuisines
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE r.cuisines LIKE 'Italian%' OR r.cuisines LIKE 'Japanese%';

-- Query 6 - Optimized: Find the restaurant with the highest rating in each country
-- A materialized view is created to cache the highest-rated restaurant for each country.
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

SELECT * FROM top_rated_restaurants;

-- Query 8 - Optimized: Find closest restaurants to a given location)
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

