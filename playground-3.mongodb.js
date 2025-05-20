// ALTERNATIVE SEVERAL COLLECTIONS

// 'countries' collection
try {
    db.createCollection("countries", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          title: "Country Object Validation",
          required: ["country_code", "country_name"],
          properties: {
            country_code: {
              bsonType: "int",
              description: "Unique identifier for the country, must be an integer and is required."
            },
            country_name: {
              bsonType: "string",
              description: "Name of the country, must be a string and one of the predefined names, and is required.",
              enum: [
                "India", "Australia", "Brazil", "Canada", "Indonesia",
                "New Zealand", "Phillipines", "Qatar", "Singapore",
                "South Africa", "Sri Lanka", "Turkey", "UAE",
                "United Kingdom", "United States"
              ]
            }
          }
        }
      }
    });
    console.log("'countries' collection created successfully.");
    db.countries.createIndex({ "country_code": 1 }, { unique: true, name: "country_code_unique_index" });
    console.log("Created unique index on 'countries.country_code'.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'countries' collection already exists.");
    } else {
      console.error("Error creating 'countries' collection:", e);
    }
  }
  
  // 'restaurants_core' collection
  try {
    db.createCollection("restaurants_core", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          title: "Restaurant Core Object Validation",
          required: ["restaurant_id", "restaurant_name"],
          properties: {
            restaurant_id: {
              bsonType: "int",
              description: "Unique identifier for the restaurant, must be an integer and is required."
            },
            restaurant_name: {
              bsonType: "string",
              description: "Name of the restaurant, must be a string and is required."
            },
            cuisines: {
              bsonType: "array",
              description: "List of cuisines offered, must be an array of strings.",
              items: { bsonType: "string" }
            },
            average_cost_for_two: {
              bsonType: ["int", "long", "double", "null"],
              description: "Average cost for two people, must be a number or null.",
              minimum: 0
            },
            // Optional fields that were in the original flat structure
            has_table_booking: {
              bsonType: ["bool", "null"],
              description: "Indicates if table booking is available."
            },
            has_online_delivery: {
              bsonType: ["bool", "null"],
              description: "Indicates if online delivery is available."
            }
          },
          additionalProperties: true // Or false for stricter control
        }
      }
    });
    console.log("'restaurants_core' collection created successfully.");
    db.restaurants_core.createIndex({ "restaurant_id": 1 }, { unique: true, name: "core_restaurant_id_unique_index" });
    db.restaurants_core.createIndex({ "cuisines": 1 }, { name: "core_cuisines_index" });
    console.log("Created indexes on 'restaurants_core'.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'restaurants_core' collection already exists.");
    } else {
      console.error("Error creating 'restaurants_core' collection:", e);
    }
  }
  
  // 'restaurant_locations' collection
  try {
    db.createCollection("restaurant_locations", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          title: "Restaurant Location Object Validation",
          required: ["restaurant_id", "city", "country_code", "location_geojson"],
          properties: {
            restaurant_id: { // Foreign Key linking to restaurants_core
              bsonType: "int",
              description: "Identifier linking to the restaurant, must be an integer and is required."
            },
            address_street: { bsonType: "string", description: "Street address." },
            city: { bsonType: "string", description: "City name, must be a string and is required." },
            locality: { bsonType: "string", description: "Locality name." },
            locality_verbose: { bsonType: "string", description: "Detailed locality information." },
            country_code: { // Foreign Key linking to countries
              bsonType: "int",
              description: "Country code linking to the countries collection, must be an integer and is required."
            },
            location_geojson: { // Renamed from 'location' to be more specific
              bsonType: "object",
              required: ["type", "coordinates"],
              properties: {
                type: {
                  enum: ["Point"],
                  description: "GeoJSON type, must be 'Point'."
                },
                coordinates: {
                  description: "Must be an array of 2 doubles (longitude, latitude) OR the array [400, 400] to mark an error.",
                  oneOf: [
                    { // Valid geospatial array
                      bsonType: "array", minItems: 2, maxItems: 2,
                      items: [
                        { bsonType: "double", minimum: -180, maximum: 180, description: "Longitude." },
                        { bsonType: "double", minimum: -90, maximum: 90, description: "Latitude." }
                      ]
                    },
                    { // Error marker array [400, 400]
                      bsonType: "array", minItems: 2, maxItems: 2,
                      items: [
                          { bsonType: "int", enum: [400], description: "Error marker for longitude." },
                          { bsonType: "int", enum: [400], description: "Error marker for latitude." }
                      ],
                      description: "Error marker [400, 400] for invalid coordinates."
                    }
                  ]
                }
              }
            }
          },
          additionalProperties: true
        }
      }
    });
    console.log("'restaurant_locations' collection created successfully.");
    db.restaurant_locations.createIndex({ "restaurant_id": 1 }, { unique: true, name: "locations_restaurant_id_unique_index" }); // Assuming one location entry per restaurant
    db.restaurant_locations.createIndex({ "location_geojson.coordinates": "2dsphere" }, { name: "locations_geospatial_index" });
    db.restaurant_locations.createIndex({ "country_code": 1 }, { name: "locations_country_code_index" });
    db.restaurant_locations.createIndex({ "city": 1 }, { name: "locations_city_index" });
    console.log("Created indexes on 'restaurant_locations'.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'restaurant_locations' collection already exists.");
    } else {
      console.error("Error creating 'restaurant_locations' collection:", e);
    }
  }

  // 5. Create the 'restaurant_ratings' collection
  try {
    db.createCollection("restaurant_ratings", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          title: "Restaurant Rating Object Validation",
          required: ["restaurant_id", "aggregate_rating", "votes", "price_range"],
          properties: {
            restaurant_id: { // Foreign Key linking to restaurants_core
              bsonType: "int",
              description: "Identifier linking to the restaurant, must be an integer and is required."
            },
            aggregate_rating: {
              bsonType: "double",
              description: "Overall rating, must be a double between 0 and 5.",
              minimum: 0, maximum: 5
            },
            rating_color: { bsonType: "string", description: "Color associated with the rating." },
            rating_text: { bsonType: "string", description: "Textual description of the rating." },
            votes: {
              bsonType: "int",
              description: "Number of votes, must be a non-negative integer.",
              minimum: 0
            },
            price_range: {
              bsonType: "int",
              description: "Price range category, must be an integer (e.g., 0-4 or 1-4).",
              minimum: 0, maximum: 4 // Adjust as per your data logic
            },
            currency: { bsonType: "string", description: "Currency for the price." }
          },
          additionalProperties: true
        }
      }
    });
    console.log("'restaurant_ratings' collection created successfully.");
    db.restaurant_ratings.createIndex({ "restaurant_id": 1 }, { unique: true, name: "ratings_restaurant_id_unique_index" }); // Assuming one rating entry per restaurant
    db.restaurant_ratings.createIndex({ "aggregate_rating": -1 }, { name: "ratings_aggregate_rating_index" });
    db.restaurant_ratings.createIndex({ "price_range": 1 }, { name: "ratings_price_range_index" });
    console.log("Created indexes on 'restaurant_ratings'.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'restaurant_ratings' collection already exists.");
    } else {
      console.error("Error creating 'restaurant_ratings' collection:", e);
    }
  }
  
  // ----------------------------------------------------------------------------------
  // 6. Data Import Guide (To be run from your SYSTEM TERMINAL, not mongosh)
  // ----------------------------------------------------------------------------------
  console.log("\n--- DATA IMPORT GUIDE (Run from SYSTEM TERMINAL) ---");
  console.log("1. MODIFY YOUR PYTHON SCRIPT ('migrate_to_mongo.py'):");
  console.log("   - The script now needs to generate FOUR separate JSONL files:");
  console.log("     - 'countries.jsonl' (from Country-Code.csv)");
  console.log("     - 'restaurants_core.jsonl'");
  console.log("     - 'restaurant_locations.jsonl'");
  console.log("     - 'restaurant_ratings.jsonl'");
  console.log("   - For each row in 'new_dataset.csv', extract the relevant fields for each of the above JSONL files.");
  console.log("   - Ensure 'restaurant_id' is included in 'restaurants_core.jsonl', 'restaurant_locations.jsonl', and 'restaurant_ratings.jsonl' to link them.");
  console.log("   - For 'restaurant_locations.jsonl', handle the 'location_geojson.coordinates' to be [400, 400] for invalid CSV coordinates.");
  console.log("   - Ensure data types in the generated JSONL files match the schemas defined above.");
  console.log("\n2. IMPORT THE JSONL FILES USING 'mongoimport' (run for each file):");
  console.log("   Open your system terminal, navigate to the directory with your JSONL files, and run:");
  console.log("\n   mongoimport --uri \"mongodb://localhost:27017/your_zomato_db\" --collection countries --file countries.jsonl");
  console.log("   mongoimport --uri \"mongodb://localhost:27017/your_zomato_db\" --collection restaurants_core --file restaurants_core.jsonl");
  console.log("   mongoimport --uri \"mongodb://localhost:27017/your_zomato_db\" --collection restaurant_locations --file restaurant_locations.jsonl");
  console.log("   mongoimport --uri \"mongodb://localhost:27017/your_zomato_db\" --collection restaurant_ratings --file restaurant_ratings.jsonl\n");
  console.log("   (Replace 'your_zomato_db' with your actual database name.)");
  console.log("   (If your JSONL files are structured as one JSON object per line, do NOT use --jsonArray).");
  console.log("----------------------------------------------------");