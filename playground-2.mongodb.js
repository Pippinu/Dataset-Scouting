// MAIN VERSION, SINGLE COLLECTION

// Collection restaurants
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
                // DROPPED, NOT REQUIRED
                // country_code: { 
                //     bsonType: "int", 
                //     description: "must be an integer",
                //     // Limit choices to a specific set of country codes if needed
                //     enum: [1, 14, 30, 37, 94, 148, ] // Example country codes
                // },
                country_name: { bsonType: "string", description: "must be a string and is required" }
              }
            },
            location: {
              bsonType: "object",
              required: ["type", "coordinates"],
              properties: {
                type: {
                  enum: ["Point"],
                  description: "must be 'Point' and is required for GeoJSON"
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
                    { // Error marker array [400, 400] to mark invalid coordinates from CSV
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
            // Add other optional fields like 'is_delivering_now', 'switch_to_order_menu' if needed
          },
          // To allow fields not explicitly defined in properties (e.g. if your python script adds more)
          // For stricter control, set additionalProperties: false
          additionalProperties: false
        }
      },
      // validationLevel: "moderate", // "strict" (default) or "moderate" or "off"
      // validationAction: "warn"  // "error" (default) or "warn"
    });
    console.log("'restaurants' collection created successfully with schema validation.");
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      console.log("'restaurants' collection already exists. If you want to re-apply schema, drop it first or use collMod.");
      // Example of modifying an existing collection's validator:
      // db.runCommand({
      //   collMod: "restaurants",
      //   validator: { /* your $jsonSchema here */ },
      //   validationLevel: "strict" // or "moderate"
      // });
      // console.log("Attempted to modify existing collection schema. Check 'ok' status in output.");
    } else {
      console.error("Error creating 'restaurants' collection:", e);
    }
  }
  
  // ----------------------------------------------------------------------------------
  // 3. Create Indexes
  // ----------------------------------------------------------------------------------
  try {
    // Geospatial index for location queries (Query 8)
    db.restaurants.createIndex({ "location": "2dsphere" }, { name: "location_geospatial_index" });
    console.log("Created 2dsphere index on 'location' field.");
  
    // Example of other potentially useful indexes:
    // Ensure restaurant_id is unique if it's not your MongoDB _id
    // db.restaurants.createIndex({ "restaurant_id": 1 }, { unique: true, name: "restaurant_id_unique_index" });
  
    // db.restaurants.createIndex({ "address.city": 1 }, { name: "address_city_index" });
    // db.restaurants.createIndex({ "address.country_name": 1 }, { name: "address_country_index" });
    // db.restaurants.createIndex({ "cuisines": 1 }, { name: "cuisines_array_index" }); // For queries on the cuisines array
    // db.restaurants.createIndex({ "rating_details.aggregate_rating": -1 }, { name: "rating_aggregate_index" });
    // db.restaurants.createIndex({ "rating_details.price_range": 1 }, { name: "rating_price_range_index" });
  
    console.log("Finished creating or verifying indexes.");
  } catch (e) {
    console.error("Error creating indexes:", e);
  }
  
  // ----------------------------------------------------------------------------------
  // 4. Data Import Guide (To be run from your SYSTEM TERMINAL, not mongosh)
  // ----------------------------------------------------------------------------------
  console.log("\n--- DATA IMPORT GUIDE (Run from SYSTEM TERMINAL) ---");
  console.log("1. PREPARE YOUR DATA AS JSONL (JSON Lines):");
  console.log("   - The schema validation expects data in a specific JSON structure.");
  console.log("   - Use the Python script previously provided ('migrate_to_mongo.py') to convert");
  console.log("     your 'new_dataset.csv' and 'Country-Code.csv' into a 'restaurants_mongo.jsonl' file.");
  console.log("   - Ensure the Python script generates JSON that matches the schema defined above.");
  console.log("     (e.g., 'location.coordinates' must be an array of two numbers [longitude, latitude]).");
  console.log("\n2. IMPORT THE JSONL FILE USING 'mongoimport':");
  console.log("   Open your system terminal (Bash, PowerShell, CMD, etc.), navigate to the directory");
  console.log("   where 'restaurants_mongo.jsonl' is located, and run a command like this:");
  console.log("\n   mongoimport --uri \"mongodb://localhost:27017/your_zomato_db\" --collection restaurants --file restaurants_mongo.jsonl --jsonArray\n");
  console.log("   Replace 'your_zomato_db' with your actual database name.");
  console.log("   If your JSONL file has one JSON object per line (which the Python script should produce),");
  console.log("   you might not need '--jsonArray'. Test without it first:");
  console.log("\n   mongoimport --uri \"mongodb://localhost:27017/your_zomato_db\" --collection restaurants --file restaurants_mongo.jsonl\n");
  console.log("   If mongoimport reports errors, they might be due to schema validation failures.");
  console.log("   Check the errors and your JSONL file content against the schema.");
  console.log("----------------------------------------------------");
  
  // ----------------------------------------------------------------------------------
  // How to check your schema (run in mongosh):
  // ----------------------------------------------------------------------------------
  // const collectionInfo = db.getCollectionInfos({ name: "restaurants" });
  // if (collectionInfo.length > 0 && collectionInfo[0].options && collectionInfo[0].options.validator) {
  //   console.log("\nCurrent schema validator for 'restaurants':");
  //   console.log(JSON.stringify(collectionInfo[0].options.validator, null, 2));
  // } else {
  //   console.log("\nNo schema validator found for 'restaurants' or collection doesn't exist.");
  // }
  
// CHIEDERE
// 2. Per quanto riguarda address, ha senso creare un JSON annidato nonostante vi siano stringhe differenti con un numero differente di porzioni? O meglio lasciare singola stringa?
// 
// 1. Date le nostre query da SQL, le quali richiedono la raccolta di vari dati riguardo i ristoranti, 
// dividere tali dati in più collection (core, location, description, price) è controproducente?


// WHY KEEP THIS VERSION?
// 1. Le nostre query richiedono la raccolta di vari dati riguardo i ristoranti, dividere tali dati in più collection (core, location, description, price)
// comporterebbe l'uso di varie lookup (come abbiamo fatto in SQL) perdendo quindi il "potere" che NoSQL ha.

// 2. Le nostre colonne sono abbastanza poche da essere incluse in un singolo documento.

// 3. Dividere in più collezioni avrebbe più senso se, frequentemente, accedessimo a singole parti 
// del documento rispetto ad altre, ma cosi non è dato che tutte le informazioni sono equamente importanti.