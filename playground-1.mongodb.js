// SINGLE COLLECTION QUERIES

// SQL Query 1: Get the price range distribution of restaurants
const pipeline_q1 = [
    {
      // Group by price range and count the number of restaurants in each range
      $group: {
        _id: "$rating_details.price_range",
        total: { $sum: 1 }
      }
    },
    // Sort by price range in ascending order
    { $sort: { _id: 1 } },
    // Project the desired fields
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
    // Group by country and count the number of restaurants in each country
    $group: {
      _id: "$address.country_name",
      total_restaurants: { $sum: 1 }
    }
  },
  // Sort by total_restaurants in descending order
  { $sort: { total_restaurants: -1 } },
  // Project the desired fields
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
    // Sort by country and votes in ascending order and descending order, respectively
    $sort: {
      "address.country_name": 1,
      "rating_details.votes": -1
    }
  },
  // Group by country and get the first restaurant name and votes
  {
    $group: {
      _id: "$address.country_name",
      restaurant_name: { $first: "$restaurant_name" },
      votes: { $first: "$rating_details.votes" }
    }
  },
  // Sort by country name in ascending order
  { $sort: { _id: 1 } },
  // Project country name, restaurant name, and votes fields
  // Exclude the default _id field (otherwise included by default)
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
    // Match documents where the cuisines field contains either Italian or Japanese
    {
      $match: {
          // Use regex for case-insensitive to match Italian or Japanese
          cuisines: { $in: [/Italian/i, /Japanese/i] }
      }
    },
    // Project the desired fields
    // Exclude the default _id field (otherwise included by default)
    {
      $project: {
          _id: 0,
          restaurant_name: 1,
          "address.city": 1,
          "address.country_name": 1,
          cuisines: 1
      }
    },
    // Sort by restaurant name in ascending order
    { $sort: { restaurant_name: 1 } }
];
db.restaurants.aggregate(pipeline_q4);

// SQL Query 5: Get average rating per country that has an average rating greater than 4
const pipeline_q5 = [
  // Group by country and calculate the average rating
  {
    $group: {
      _id: "$address.country_name",
      // Compute the average rating using $avg on the aggregate_rating field 
      // and assign it to avg_rating new field
      avg_rating: { $avg: "$rating_details.aggregate_rating" }
    }
  },
  // Match countries with an average rating greater than 4
  { $match: { avg_rating: { $gt: 4 } } },
  {
    $project: {
      _id: 0,
      country: "$_id",
      // Round the average rating to 2 decimal places
      avg_rating: { $round: ["$avg_rating", 2] }
    }
  },
  // Sort by average rating in descending order
  { $sort: { avg_rating: -1 } }
];  
db.restaurants.aggregate(pipeline_q5);

// SQL Query 6: Find the highest rated restaurant in each country
const pipeline_q6 = [
  {
    // 1. Ordina per paese (A-Z) e poi per rating (dal più alto al più basso)
    $sort: {
      "address.country_name": 1,
      "rating_details.aggregate_rating": -1
    }
  },
  {
    // 2. Raggruppa per paese e prendi i dati del primo documento di ogni gruppo
    // (che sarà quello con il rating più alto grazie al sort precedente)
    $group: {
      _id: "$address.country_name",
      restaurant_name: { $first: "$restaurant_name" },
      aggregate_rating: { $first: "$rating_details.aggregate_rating" }
    }
  },
  {
    // 3. (Opzionale) Rinomina i campi per un output più pulito
    $project: {
      _id: 0,
      country: "$_id",
      restaurant_name: 1,
      aggregate_rating: 1
    }
  },
  {
      // 4. (Opzionale) Ordina il risultato finale per nome del paese
      $sort: { country: 1 }
  }
];
db.restaurants.aggregate(pipeline_q6);

// SQL Query 7: Find restaurants that have both high ratings (at least 4.5) and a lot of votes (more than 1000)
const pipeline_q7 = [
  {
    // Match documents that have aggregate_rating > 4.5 and votes > 1000
    $match: {
      "rating_details.aggregate_rating": { $gt: 4.5 }, // $gt "greater than"
      "rating_details.votes": { $gt: 1000 }
    }
  },
  {
    // Project the desired fields
    // Exclude the default _id field (otherwise included by default)
    $project: {
      _id: 0,
      restaurant_name: 1,
      aggregate_rating: "$rating_details.aggregate_rating",
      votes: "$rating_details.votes"
    }
  },
  {
    // Sort by aggregate_rating and votes in descending order
    $sort: {
      aggregate_rating: -1,
      votes: -1
    }
  }
];
db.restaurants.aggregate(pipeline_q7);

// SQL Query 8: Find near restaurants from a given point (e.g., longitude -78, latitude 38)

// 1. Create a 2dsphere index on the 'location' field
db.restaurants.createIndex({ location: "2dsphere" }, { name: "location_2dsphere" });

// 2. Define the target coordinates for Query 8
const targetLongitude_q8 = -78;
const targetLatitude_q8 = 38;

// 3. Define the aggregation pipeline for Query 8
const pipeline_q8 = [
  {
    // Perform the geospatial search using $geoNear
    // $geoNear MUST be the first stage in an aggregation pipeline if used.
    $geoNear: {
      // The point to search near
      near: { 
        type: "Point",
        coordinates: [targetLongitude_q8, targetLatitude_q8] // [longitude, latitude]
      },
      distanceField: "distance", // Output field that contains the calculated distance
                                 // in meters, given that coordinates are GeoJSON.
      spherical: true,           // Required for 2dsphere indexes
      query: {}                  // Optional: Additional filter criteria for documents
                                 // e.g., { "address.city": "SomeCity" }
    }
  },
  {
    // Limit the results to 10
    $limit: 10
  },
  {
    // Project the desired fields
    // $arrayElemAt to get longitude and latitude from the coordinates array
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

// SQ; Query 8: Bounding Box & Custom Distance Metric (More Robust)
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
db.restaurants.aggregate(pipeline_q8_alternative);

// DA SISTEMARE, vedi note goodnotes
// SQL Query 9: Get restaurants with the highest rating in each price range (top 5 price ranges)
const pipeline_q9 = [
  {
    // Sort by aggregate rating in descending order and votes 
    // (in case of ties in aggregate_rating) in descending order
    $sort: {
      "rating_details.aggregate_rating": -1,
      "rating_details.votes": -1 
    }
  },
  {
    // Group by price range and get the best (first given the previous sort) 
    // restaurant in each price range
    $group: {
      _id: "$rating_details.price_range",
      restaurant_name: { $first: "$restaurant_name" },
      aggregate_rating: { $first: "$rating_details.aggregate_rating" },
      votes: { $first: "$rating_details.votes" } // Carry votes through
    }
  },
  {
    // Sort in ascending order for price range.
    $sort: { _id: 1 }
  },
  {
    // Project the desired fields.
    $project: {
      _id: 0,
      price_range: "$_id",
      restaurant_name: 1,
      aggregate_rating: 1,
      votes: 1
    }
  }
];
db.restaurants.aggregate(pipeline_q9);
  
// SQL Query 10: Find the restaurant(s) with the highest rating in the database
const pipeline_q10 = [
  {
    // 
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