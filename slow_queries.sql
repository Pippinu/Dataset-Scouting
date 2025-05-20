-- 1. Get the price range distribution of restaurants
SELECT rt.price_range, COUNT(*) AS total
FROM rating rt
GROUP BY rt.price_range
ORDER BY rt.price_range;

-- 2. Count the number of restaurants per country
SELECT c.country, COUNT(r.restaurant_id) AS total_restaurants
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
GROUP BY c.country
ORDER BY total_restaurants DESC;

-- 3. Find the most voted restaurant in each country
SELECT DISTINCT ON (c.country) 
    c.country, 
    r.restaurant_name, 
    rt.votes
FROM restaurants r
JOIN rating rt ON r.restaurant_id = rt.restaurant_id
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
ORDER BY c.country, rt.votes DESC;

-- 4. Find restaurants by cuisine
SELECT r.restaurant_name, a.city, c.country, r.cuisines
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
WHERE r.cuisines ILIKE '%Italian%' OR r.cuisines ILIKE '%Japanese%';

-- 5. Get average rating per country that has an average rating greater than 4
SELECT c.country, ROUND(CAST(AVG(rt.aggregate_rating) AS NUMERIC), 2) AS avg_rating
FROM restaurants r
JOIN rating rt ON r.restaurant_id = rt.restaurant_id
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
GROUP BY c.country
HAVING AVG(rt.aggregate_rating) > 4
ORDER BY avg_rating DESC;

-- 6. Find the highest-rated restaurant in each country
SELECT DISTINCT ON (c.country) 
    c.country, 
    r.restaurant_name, 
    rt.aggregate_rating
FROM restaurants r
JOIN rating rt ON r.restaurant_id = rt.restaurant_id
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
ORDER BY c.country, rt.aggregate_rating DESC;

-- 7. Get restaurants that have both high rating and many votes
SELECT r.restaurant_name, rt.aggregate_rating, rt.votes
FROM restaurants r
JOIN rating rt ON r.restaurant_id = rt.restaurant_id
WHERE rt.aggregate_rating > 4.5 AND rt.votes > 1000
ORDER BY rt.aggregate_rating DESC, rt.votes DESC;

-- 8. Find closest restaurants using a bounding box and a simple distance metric (Euclidean distance)
SELECT 
    r.restaurant_name, 
    a.city, 
    c.country, 
    co.longitude, 
    co.latitude,
    ROUND(CAST((POW(co.longitude - (-78), 2) + POW(co.latitude - 38, 2)) AS NUMERIC), 2) AS distance_metric
FROM restaurants r
JOIN restaurant_address a ON r.restaurant_id = a.restaurant_id
JOIN countries c ON a.country_code = c.country_code
JOIN coordinates co ON r.restaurant_id = co.restaurant_id
WHERE co.longitude BETWEEN -82.5 AND -74.5
  AND co.latitude BETWEEN 33 AND 44
ORDER BY distance_metric ASC
LIMIT 10;

-- 9. Get restaurants with the highest rating in each price range
SELECT ranked.price_range, ranked.restaurant_name, ranked.aggregate_rating
FROM (
    SELECT rt.price_range, r.restaurant_name, rt.aggregate_rating,
           RANK() OVER (PARTITION BY rt.price_range ORDER BY rt.aggregate_rating DESC) AS rank
    FROM restaurants r
    JOIN rating rt ON r.restaurant_id = rt.restaurant_id
) ranked
WHERE rank = 1
LIMIT 5;

-- 10. Find the restaurant with the highest rating in database
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
