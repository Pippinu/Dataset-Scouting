// DOUBLE COLLECTION SCHEMA

// Create new database 
use('double_restaurant_db');

// 1. Create the 'restaurants_main' collection (for more static data)
try {
    db.createCollection("restaurants_main", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          title: "Restaurant Main Object Validation",
          // required fields for the main restaurant document
          required: [
            "restaurant_id",
            "restaurant_name",
            "address",
            "location",
            "cuisines",
            "rating_details"
          ],
          // properties and their types
          properties: {
            restaurant_id: {
              // Type
              bsonType: "int",
              // Description
              description: "Unique identifier for the restaurant, must be an integer and is required."
            },
            restaurant_name: {
              bsonType: "string",
              description: "Name of the restaurant, must be a string and is required."
            },
            address: {
              bsonType: "object",
              // Required fields for the address object
              required: ["city", "country_name"],
              properties: {
                street: { bsonType: "string", description: "must be a string" },
                city: { bsonType: "string", description: "must be a string and is required" },
                locality: { bsonType: "string", description: "must be a string" },
                locality_verbose: { bsonType: "string", description: "must be a string" },
                country_name: { bsonType: "string", description: "must be a string and is required" }
              }
            },
            location: {
              bsonType: "object",
              required: ["type", "coordinates"],
              properties: {
                type: {
                  enum: ["Point"],
                  description: "must be 'Point' and is required for GeoJSON format"
                },
                coordinates: {
                  description: "Must be an array of 2 doubles (longitude, latitude) OR the array [400, 400] to mark an error.",
                  oneOf: [
                    { // Valid geospatial array
                      bsonType: "array", minItems: 2, maxItems: 2,
                      items: [
                        // Longitude and Latitude bound values
                        { bsonType: "double", minimum: -180, maximum: 180, description: "Longitude." },
                        { bsonType: "double", minimum: -90, maximum: 90, description: "Latitude." }
                      ]
                    },
                    { // Error marker array [400, 400] for invalid coordinates in the CSV
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
            },
            cuisines: {
              bsonType: "array",
              description: "List of cuisines offered, must be an array of strings.",
              // Items of array must be strings
              items: { bsonType: "string" }
            },
            average_cost_for_two: {
              bsonType: ["int", "long", "double", "null"],
              description: "Average cost for two people, must be a number or null.",
              minimum: 0
            },
            rating_details: { // Will now exclude aggregate_rating and votes, stored in a separate collection
              bsonType: "object",
              required: ["price_range"], // Only price_range might be strictly required here now
              properties: {
                rating_color: { bsonType: "string", description: "Color associated with the rating." },
                rating_text: { bsonType: "string", description: "Textual description of the rating." },
                price_range: {
                  bsonType: "int",
                  description: "Price range category, must be an integer in range 0-4.",
                  minimum: 0, maximum: 4
                },
                currency: { bsonType: "string", description: "Currency for the price." }
              }
            },
          },
          // Additional properties are allowed, this option allow to store extra fields that might not be defined in the schema, NoSQL flexibility
          additionalProperties: true
        }
      }
    });
    console.log("'restaurants_main' collection created successfully.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'restaurants_main' collection already exists.");
    } else {
      console.error("Error creating 'restaurants_main' collection:", e);
    }
  }
  
  // 3. Create the 'restaurant_live_ratings' collection (for frequently updated data)w
  try {
    db.createCollection("restaurant_live_ratings", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          title: "Restaurant Live Ratings Object Validation",
          required: ["restaurant_id", "aggregate_rating", "votes"],
          properties: {
            restaurant_id: { // Foreign Key linking to restaurants_main
              bsonType: "int",
              description: "Identifier linking to the main restaurant document, must be an integer and is required."
            },
            aggregate_rating: {
              bsonType: "double",
              description: "Overall live rating, must be a double between 0 and 5.",
              minimum: 0, maximum: 5
            },
            votes: {
              bsonType: "int",
              description: "Current number of votes, must be a non-negative integer.",
              minimum: 0
            },
            last_updated_timestamp: { // To track when the rating was last updated
                bsonType: "date",
                description: "Timestamp of the last rating update."
            }
          },
          // Additional properties are not allowed in this collection to ensure strict validation
          additionalProperties: false
        }
      }
    });
    console.log("'restaurant_live_ratings' collection created successfully.");

    // CHE FARE CON QUESTI INDICI?

    // This index ensures quick lookups by restaurant_id and that each restaurant has only one live rating document.
    db.restaurant_live_ratings.createIndex({ "restaurant_id": 1 }, { unique: true, name: "liveratings_restaurant_id_unique_index" });
    // Index to quickly find top-rated or most-voted if querying this collection directly
    db.restaurant_live_ratings.createIndex({ "aggregate_rating": -1, "votes": -1 }, { name: "liveratings_rating_votes_index" });
    console.log("Created indexes on 'restaurant_live_ratings'.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'restaurant_live_ratings' collection already exists.");
    } else {
      console.error("Error creating 'restaurant_live_ratings' collection:", e);
    }
  }
  
  // IMPORT DATA TO MONGODB USING FOLLOW COMMANDS
// mongoimport --db double_restaurant_db --collection restaurants_main --type csv --file new_dataset.csv --headerline
// mongoimport --db double_restaurant_db --collection restaurant_live_ratings --type csv --file new_dataset.csv --headerline