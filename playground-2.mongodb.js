// SINGLE COLLECTION SCHEMA
try {
    db.createCollection("restaurants", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          title: "Restaurant Object Validation",
          required: [
            "restaurant_id",
            "restaurant_name",
            "address",
            "location",
            "cuisines",
            "rating_details"
          ],
          properties: {
            restaurant_id: {
              bsonType: "int",
              description: "must be an integer and is required"
            },
            restaurant_name: {
              bsonType: "string",
              description: "must be a string and is required"
            },
            address: {
              bsonType: "object",
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
                  bsonType: "array",
                  description: "must be an array of 2 doubles (longitude, latitude) and is required",
                  minItems: 2,
                  maxItems: 2,
                  items: [
                    {
                      bsonType: "double",
                      description: "Longitude, must be a double between -180 and 180",
                      minimum: -180,
                      maximum: 180
                    },
                    {
                      bsonType: "double",
                      description: "Latitude, must be a double between -90 and 90",
                      minimum: -90,
                      maximum: 90
                    },
                    { // Error marker array [400, 400] to mark, eventually, invalid coordinates from CSV
                        bsonType: "array",
                        description: "Error marker array [400, 400] for invalid coordinates from CSV.",
                        minItems: 2,
                        maxItems: 2,
                        items: [
                            { bsonType: "int", enum: [400], description: "Marker for longitude" },
                            { bsonType: "int", enum: [400], description: "Marker for latitude" }
                        ]
                      }
                  ]
                }
              }
            },
            cuisines: {
              bsonType: "array",
              description: "must be an array of strings",
              items: {
                bsonType: "string"
              }
            },
            average_cost_for_two: {
              bsonType: ["int", "long", "double", "null"], // Allow null if it can be missing or explicitly null
              description: "must be a number or null",
              minimum: 0
            },
            rating_details: {
              bsonType: "object",
              required: ["aggregate_rating", "votes", "price_range"],
              properties: {
                aggregate_rating: {
                  bsonType: "double",
                  description: "must be a double between 0 and 5",
                  minimum: 0,
                  maximum: 5
                },
                rating_color: { bsonType: "string" },
                rating_text: { bsonType: "string" },
                votes: {
                  bsonType: "int",
                  description: "must be an integer, non-negative",
                  minimum: 0
                },
                price_range: {
                  bsonType: "int",
                  description: "must be an integer between 0 and 4", // Assuming 0 might be valid if unknown
                  minimum: 0, // Or 1 if 0 is not allowed
                  maximum: 4
                },
                currency: { bsonType: "string" }
              }
            }
          },
          // To not allow fields not explicitly defined in properties
          additionalProperties: false
        }
      },
    });
    console.log("'restaurants' collection created successfully with schema validation.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'restaurants' collection already exists. If you want to re-apply schema, drop it first or use collMod.");
    } else {
      console.error("Error creating 'restaurants' collection:", e);
    }
  }