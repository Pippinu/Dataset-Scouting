// The current database to use. NOT NEEDED ANYMORE
// use("Restaurant_DB");

// SQL Query 1: Get the price range distribution of restaurants
const pipeline_q1 = [
    {
      $group: {
        _id: "$rating_details.price_range",
        total: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        price_range: "$_id",
        total: 1
      }
    }
];
db.restaurants.aggregate(pipeline_q1);

// SQL Query 2: Count the number of restaurants per country
const pipeline_q2 = [
  {
    $group: {
      _id: "$address.country_name",
      total_restaurants: { $sum: 1 }
    }
  },
  { $sort: { total_restaurants: -1 } },
  {
    $project: {
      _id: 0,
      country: "$_id",
      total_restaurants: 1
    }
  }
];
db.restaurants.aggregate(pipeline_q2);

// SQL Query 3: Find the most voted restaurant in each country
const pipeline_q3 = [
  {
    $sort: {
      "address.country_name": 1,
      "rating_details.votes": -1
    }
  },
  {
    $group: {
      _id: "$address.country_name",
      restaurant_name: { $first: "$restaurant_name" },
      votes: { $first: "$rating_details.votes" }
    }
  },
  { $sort: { _id: 1 } },
  {
    $project: {
      _id: 0,
      country: "$_id",
      restaurant_name: 1,
      votes: 1
    }
  }
];
db.restaurants.aggregate(pipeline_q3);

// SQL Query 4: Find restaurants by cuisine (e.g., Italian or Japanese)"
const pipeline_q4 = [
    {
        $match: {
            // Use regex for case-insensitive matching on array elements
            cuisines: { $in: [/Italian/i, /Japanese/i] }
        }
    },
    {
        $project: {
            _id: 0,
            restaurant_name: 1,
            "address.city": 1,
            "address.country_name": 1,
            cuisines: 1
        }
    },
    { $sort: { restaurant_name: 1 } }
];
db.restaurants.aggregate(pipeline_q4);

// SQL Query 5: Get average rating per country that has an average rating greater than 4
const pipeline_q5 = [
  {
    $group: {
      _id: "$address.country_name",
      avg_rating: { $avg: "$rating_details.aggregate_rating" }
    }
  },
  { $match: { avg_rating: { $gt: 4 } } },
  {
    $project: {
      _id: 0,
      country: "$_id",
      avg_rating: { $round: ["$avg_rating", 2] }
    }
  },
  { $sort: { avg_rating: -1 } }
];  
db.restaurants.aggregate(pipeline_q5);

// SQL Query 6: Find restaurants with online delivery AND table booking
const pipeline_q6 = [
    {
        $match: {
            has_online_delivery: true,
            has_table_booking: true
        }
    },
    {
        $project: {
            _id: 0,
            restaurant_name: 1,
            "address.city": 1,
            "address.country_name": 1
        }
    }
];
db.restaurants.aggregate(pipeline_q6);

// SQL Query 7: Find restaurants that offer online delivery OR table booking
// Note: Assumes 'has_online_delivery' and 'has_table_booking' fields exist.
const pipeline_q7 = [
    {
        $match: {
            $or: [
                { has_online_delivery: true },
                { has_table_booking: true }
            ]
        }
    },
    {
        $project: {
            _id: 0,
            restaurant_name: 1,
            "address.city": 1,
            "address.country_name": 1
        }
    }
];
db.restaurants.aggregate(pipeline_q7);
  
// TO BE FIXED
// SQL Query 8: Find 5 closest restaurants to a given location (e.g., Long: -78, Lat: 38)
// First, ensure you have a 2dsphere index: db.restaurants.createIndex({ "location": "2dsphere" })

// db.restaurants.createIndex({ "location": "2dsphere" })

// const pipeline_q8 = [
//     {
//         $geoNear: {
//             near: {
//                 type: "Point",
//                 coordinates: [-78, 38]
//             },
//             distanceField: "distance",
//             spherical: true
//         }
//     },
//     {
//         $project: {
//             _id: 0,
//             restaurant_name: 1,
//             "address.city": 1,
//             "address.country_name": 1,
//             longitude: { $arrayElemAt: ["$location.coordinates", 0] },
//             latitude: { $arrayElemAt: ["$location.coordinates", 1] }
//         }
//     },
//     { $sort: { distance: 1 } },
//     { $limit: 5 }
// ];

// 1. Define the target coordinates for Query 8
const targetLongitude_q8 = -78;
const targetLatitude_q8 = 38;

// 2. Define the aggregation pipeline for Query 8
const pipeline_q8 = [
  {
    // Stage 1: Perform the geospatial search
    // $geoNear MUST be the first stage in an aggregation pipeline if used.
    // It requires a 2dsphere index on the 'key' field.
    $geoNear: {
      near: { // The point to search near
        type: "Point",
        coordinates: [targetLongitude_q8, targetLatitude_q8] // [longitude, latitude]
      },
      distanceField: "distance", // Output field that contains the calculated distance
                                 // The distance is in meters if coordinates are GeoJSON.
      spherical: true,           // Required for 2dsphere indexes
      query: {}                  // Optional: Additional filter criteria for documents
                                 // e.g., { "address.city": "SomeCity" }
      // Optional: maxDistance: <distance_in_meters> // To limit search radius
      // e.g., maxDistance: 50000 // 50 kilometers
    }
  },
  {
    // Stage 2: Limit the results (as per original SQL query)
    $limit: 10
  },
  {
    // Stage 3: Project the desired fields
    // Now we can use aggregation expressions like $arrayElemAt
    $project: {
      _id: 0, // Exclude the default _id
      restaurant_name: 1, // Include restaurant_name
      "address.city": "$address.city", // Access nested fields
      "address.country_name": "$address.country_name",
      longitude: { $arrayElemAt: ["$location.coordinates", 0] },
      latitude: { $arrayElemAt: ["$location.coordinates", 1] },
      // location_data: "$location", // Optionally include the original location object
      distance_calculated: "$distance" // Optionally include the calculated distance
    }
  }
  // // Optional Stage 4: Sort if needed (though $geoNear inherently sorts by distance)
  // // { $sort: { distance_calculated: 1 } }
];
db.restaurants.aggregate(pipeline_q8);

// ALTERNATIVE TO BE EQUAL TO SQL COUNTERPART

// MongoDB Playground - Query 8: Bounding Box & Custom Distance Metric (More Robust)
// 1. Define the target coordinates for distance calculation (from SQL query)
const targetLongitude_q8_sql = -78;
const targetLatitude_q8_sql = 38;

// 2. Define the bounding box coordinates (from SQL query's WHERE clause)
const minLongitude_sql = -82.5;
const maxLongitude_sql = -74.5;
const minLatitude_sql = 33;
const maxLatitude_sql = 44;

// 3. Define the aggregation pipeline for Query 8 to match SQL logic
const pipeline_q8_alternative = [
  {
    // Stage 1: Filter documents within the bounding box
    // The 'location.coordinates' field stores [longitude, latitude]
    $match: {
      $and: [
        { "location.coordinates.0": { $gte: minLongitude_sql, $lte: maxLongitude_sql } }, // Longitude
        { "location.coordinates.1": { $gte: minLatitude_sql, $lte: maxLatitude_sql } }  // Latitude
      ]
    }
  },
  {
    // Stage 2: Project and explicitly define longitude and latitude fields
    // This helps in isolating them and checking their types.
    $project: {
      // Keep original fields by projecting $$ROOT and then merging
      original_doc: "$$ROOT", // Keep the original document structure
      extracted_longitude: { $arrayElemAt: ["$location.coordinates", 0] },
      extracted_latitude: { $arrayElemAt: ["$location.coordinates", 1] }
    }
  },
  {
    // Stage 3: Ensure extracted longitude and latitude are numbers before further processing
    // This will filter out documents where coordinates were not as expected (e.g., not a number).
    $match: {
      extracted_longitude: { $type: "double" }, // or "number" if you have mixed int/double
      extracted_latitude: { $type: "double" }   // or "number"
    }
  },
  {
    // Stage 4: Calculate the custom distance_metric using the extracted numeric coordinates
    $addFields: {
      // Merge original_doc fields back into the root
      // This is done by projecting original_doc fields directly.
      // We need to list them or use a more dynamic approach if there are many.
      // For simplicity, we'll re-project known needed fields from original_doc.
      restaurant_name: "$original_doc.restaurant_name",
      address: "$original_doc.address", // Keep the whole address object
      location: "$original_doc.location", // Keep the whole location object
      // Add other fields from original_doc you need in the final output explicitly
      // Or, if you are on MongoDB 4.2+, you could use $replaceRoot with $mergeObjects:
      // $replaceRoot: { newRoot: { $mergeObjects: [ "$original_doc", "$$ROOT" ] } }
      // then remove original_doc: 0 from $project in the next stage.
      // For now, we'll stick to explicit re-projection for wider compatibility.

      distance_metric: {
        $add: [
          {
            $pow: [
              { $subtract: ["$extracted_longitude", targetLongitude_q8_sql] },
              2
            ]
          },
          {
            $pow: [
              { $subtract: ["$extracted_latitude", targetLatitude_q8_sql] },
              2
            ]
          }
        ]
      }
    }
  },
  {
    // Stage 5: Sort by the calculated distance_metric in ascending order
    $sort: {
      distance_metric: 1 // 1 for ascending
    }
  },
  {
    // Stage 6: Limit the results to the top 5
    $limit: 10
  },
  {
    // Stage 7: Project the final desired fields
    $project: {
      _id: 0, // Exclude the default _id
      restaurant_name: 1, // Use the re-projected restaurant_name
      "address.city": "$address.city", // Access from the re-projected address object
      "address.country_name": "$address.country_name",
      longitude: "$extracted_longitude", // Use the validated numeric longitude
      latitude: "$extracted_latitude",   // Use the validated numeric latitude
      distance_metric: { $round: ["$distance_metric", 2] }
      // original_doc: 0 // Remove the temporary field if you didn't use $replaceRoot
    }
  }
];

// 4. Execute the aggregation query
// Make sure your collection name is correct (e.g., 'restaurants')
db.restaurants.aggregate(pipeline_q8_alternative);

// SCHEMA UPDATE, MIGHT NOT WORK
// --- To find documents with potentially malformed coordinates that were filtered out ---
/*
const findMalformedCoordinatesPipeline = [
  {
    $match: { // Initial bounding box filter
      $and: [
        { "location.coordinates.0": { $gte: minLongitude_sql, $lte: maxLongitude_sql } },
        { "location.coordinates.1": { $gte: minLatitude_sql, $lte: maxLatitude_sql } }
      ]
    }
  },
  {
    $project: {
      _id: 1,
      restaurant_id: "$restaurant_id", // Assuming you have this field
      location_coordinates: "$location.coordinates",
      longitude_type: { $type: { $arrayElemAt: ["$location.coordinates", 0] } },
      latitude_type: { $type: { $arrayElemAt: ["$location.coordinates", 1] } }
    }
  },
  {
    $match: { // Filter for documents where extracted coordinates are NOT numbers
      $or: [
        { longitude_type: { $ne: "double" } },
        { latitude_type: { $ne: "double" } }
      ]
    }
  }
];
// db.restaurants.aggregate(findMalformedCoordinatesPipeline);
*/

// SQL Query 9: Get restaurants with the highest rating in each price range (top 5 price ranges)
const pipeline_q9 = [
  {
    $sort: {
      "rating_details.price_range": 1,
      "rating_details.aggregate_rating": -1
    }
  },
  {
    $group: {
      _id: "$rating_details.price_range",
      restaurant_name: { $first: "$restaurant_name" },
      aggregate_rating: { $first: "$rating_details.aggregate_rating" }
    }
  },
  { $sort: { _id: 1 } },
  { $limit: 5 },
  {
    $project: {
      _id: 0,
      price_range: "$_id",
      restaurant_name: 1,
      aggregate_rating: 1
    }
  }
];
db.restaurants.aggregate(pipeline_q9);
  
// SQL Query 10: Find the restaurant(s) with the highest rating in the database
const pipeline_q10 = [
  {
    $group: {
      _id: null,
      max_overall_rating: { $max: "$rating_details.aggregate_rating" },
      documents: { $push: "$$ROOT" }
    }
  },
  { $unwind: "$documents" },
  {
    $match: {
      $expr: { $eq: ["$documents.rating_details.aggregate_rating", "$max_overall_rating"] }
    }
  },
  { $replaceRoot: { newRoot: "$documents" } },
  {
    $project: {
      _id: 0,
      country: "$address.country_name",
      restaurant_name: 1,
      aggregate_rating: "$rating_details.aggregate_rating"
    }
  },
  { $sort: { country: 1, restaurant_name: 1 } }
];
db.restaurants.aggregate(pipeline_q10);


// Find restaurant with restaurant_id = 6314302
db.restaurants.find({
  restaurant_id: 6314302
  }
);
