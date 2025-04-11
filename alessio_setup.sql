--  Drop all tables if they exist to restart the setup
DROP TABLE IF EXISTS rating CASCADE;
DROP TABLE IF EXISTS coordinates CASCADE;
DROP TABLE IF EXISTS restaurant_address CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;

-- Create the main 'restaurants' table
CREATE TABLE restaurants (
    restaurant_id INT PRIMARY KEY,
    restaurant_name TEXT NOT NULL,
    country_code INT,
    city TEXT,
    address TEXT,
    locality TEXT,
    locality_verbose TEXT,
    longitude FLOAT,
    latitude FLOAT,
    cuisines TEXT,
    average_cost_for_two INT,
    currency TEXT,
    has_table_booking BOOLEAN,
    has_online_delivery BOOLEAN,
    is_delivering_now BOOLEAN,
    switch_to_order_menu BOOLEAN,
    price_range INT CHECK (price_range >= 1 AND price_range <= 4),  -- Check constraint for valid price range
    aggregate_rating FLOAT CHECK (aggregate_rating >= 0 AND aggregate_rating <= 5),  -- Check constraint for valid rating
    rating_color TEXT,
    rating_text TEXT,
    votes INT,
    UNIQUE (restaurant_id)  -- Ensure unique restaurant_id
);

-- Load data from the main CSV file into the 'restaurants' table
COPY restaurants (
    restaurant_id, 
    restaurant_name, 
    country_code, 
    city, 
    address, 
    locality, 
    locality_verbose, 
    longitude, 
    latitude, 
    cuisines, 
    average_cost_for_two, 
    currency, 
    has_table_booking, 
    has_online_delivery, 
    is_delivering_now, 
    switch_to_order_menu, 
    price_range, 
    aggregate_rating, 
    rating_color, 
    rating_text, 
    votes
)
FROM '/tmp/new_dataset.csv'
DELIMITER ',' 
CSV HEADER;

-- Create table for countries with unique country codes
CREATE TABLE countries (
    country_code INT PRIMARY KEY,
    country TEXT NOT NULL,
    UNIQUE (country_code)  -- Ensure unique country_code
);

-- Load country codes and names from CSV
COPY countries (
    country_code,
    country
)
FROM '/tmp/Country-Code.csv'
DELIMITER ',' 
CSV HEADER;

-- Verify if the country codes are loaded correctly
SELECT * FROM countries;

-- Create separate table for restaurant addresses and location info
CREATE TABLE restaurant_address (
    restaurant_id INT PRIMARY KEY,
    country_code INT NOT NULL,
    city TEXT NOT NULL,  -- Ensure city is not NULL
    address TEXT NOT NULL,  -- Ensure address is not NULL
    locality TEXT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (country_code) REFERENCES countries(country_code) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (restaurant_id)  -- Ensure unique restaurant_id
);

-- Insert address-related data from main table into 'restaurant_address'
INSERT INTO restaurant_address (restaurant_id, country_code, city, address, locality)
SELECT restaurant_id, country_code, city, address, locality
FROM restaurants;

-- Verify if the address data is inserted correctly
SELECT * FROM restaurant_address

-- Create table for storing geographical coordinates
CREATE TABLE coordinates (
    restaurant_id INT PRIMARY KEY,
    country_code INT NOT NULL,
    longitude FLOAT,
    latitude FLOAT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (country_code) REFERENCES countries(country_code) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (restaurant_id)  -- Ensure unique restaurant_id
);

-- Insert coordinates from the main table
INSERT INTO coordinates (restaurant_id, country_code, longitude, latitude)
SELECT restaurant_id, country_code, longitude, latitude
FROM restaurants;

-- Verify if the coordinates are inserted correctly
SELECT * FROM coordinates;

-- Create table for ratings and pricing info
CREATE TABLE rating (
    restaurant_id INT PRIMARY KEY,
    price_range INT CHECK (price_range >= 1 AND price_range <= 4),  -- Check constraint for valid price range
    aggregate_rating FLOAT CHECK (aggregate_rating >= 0 AND aggregate_rating <= 5),  -- Check constraint for valid rating
    rating_color TEXT,
    rating_text TEXT,
    votes INT,
    currency TEXT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (restaurant_id)  -- Ensure unique restaurant_id
);

-- Insert rating-related data from main table
INSERT INTO rating (restaurant_id, price_range, aggregate_rating, rating_color, rating_text, votes, currency)
SELECT restaurant_id, price_range, aggregate_rating, rating_color, rating_text, votes, currency
FROM restaurants;

-- Verify if the rating data is inserted correctly
SELECT * FROM rating;

-- Drop redundant columns from the main restaurants table
ALTER TABLE restaurants 
DROP COLUMN country_code, 
DROP COLUMN city, 
DROP COLUMN address, 
DROP COLUMN locality, 
DROP COLUMN locality_verbose, 
DROP COLUMN longitude, 
DROP COLUMN latitude,
DROP COLUMN currency,
DROP COLUMN has_table_booking, 
DROP COLUMN has_online_delivery, 
DROP COLUMN is_delivering_now, 
DROP COLUMN switch_to_order_menu,
DROP COLUMN price_range,
DROP COLUMN aggregate_rating,
DROP COLUMN rating_color,
DROP COLUMN rating_text,
DROP COLUMN votes;

-- In the end, restaurants table remain with restaurant id and name, cuisines and average cost for two.
SELECT * FROM restaurants;

-- Final verification queries to check that the data was split correctly
SELECT * FROM restaurants;
SELECT * FROM coordinates;
SELECT * FROM countries;
SELECT * FROM rating;
SELECT * FROM restaurant_address;
