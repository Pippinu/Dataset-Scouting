// Sone real world application may require some other tipes of collections, some that we though about are:
// 1. one collection for each table, since the SQL data used a star star schema io would have meant doing multiple lookups to perform basic querries
// 2. separating the coordinates in a separate collection, this would have made the location query more efficent as the lookup would have been done on a small number of restourant close to the point
//    but it did not have any real world use case, so we did not implement it.
// 3. one collection for cusine type, this would have made screening for single tastes but increse complexity for multiple cusine queries, wich are the most common one.
// 4. In the end we implemented a double collection schema, one for the main restaurant data and one for the live ratings, assuming that they are frequently updated and sice user only care about a small number of highly rated restourants the lookup is not costly.

// MULTIPLE COLLECTIONS
// Collection 1: restaurants_main (static info, address, location, cuisines, price_range, etc.)
// Collection 2: restaurant_live_ratings (restaurant_id, aggregate_rating, votes)

// --- Query 1: Get the price range distribution of restaurants ---
// Assumes 'price_range' is in 'restaurants_main.rating_details' and is considered static enough.
// If 'price_range' was moved to 'restaurant_live_ratings', this query would start there.
const pipeline_q1_split = [
    {
      $group: {
        _id: "$rating_details.price_range", // Path in restaurants_main
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
// db.restaurants_main.aggregate(pipeline_q1_split);

// --- Query 2: Count the number of restaurants per country ---
// This query only needs data from 'restaurants_main'.
const pipeline_q2_split = [
  {
    $group: {
      _id: "$address.country_name", // Path in restaurants_main
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
// db.restaurants_main.aggregate(pipeline_q2_split);

// --- Query 3: Find the most voted restaurant in each country ---
// Needs to join 'restaurants_main' with 'restaurant_live_ratings'.
const pipeline_q3_split = [
  {
    // Start from restaurants_main to get country and name
    $lookup: {
      from: "restaurant_live_ratings",
      localField: "restaurant_id",
      foreignField: "restaurant_id",
      as: "live_rating_info"
    }
  },
  {
    // If a restaurant might not have a rating entry, use $unwind with preserveNullAndEmptyArrays
    // For simplicity, assuming all restaurants have a corresponding rating entry.
    $unwind: "$live_rating_info"
  },
  {
    $sort: {
      "address.country_name": 1,
      "live_rating_info.votes": -1 // Sort by votes from the joined data
    }
  },
  {
    $group: {
      _id: "$address.country_name",
      restaurant_name: { $first: "$restaurant_name" },
      votes: { $first: "$live_rating_info.votes" }
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
// db.restaurants_main.aggregate(pipeline_q3_split);

// --- Query 4: Find restaurants by cuisine (e.g., Italian or Japanese) ---
// This query only needs data from 'restaurants_main'.
const pipeline_q4_split = [
    {
      $match: {
          cuisines: { $in: [/Italian/i, /Japanese/i] } // Path in restaurants_main
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
// db.restaurants_main.aggregate(pipeline_q4_split);

// --- Query 5: Get average rating per country that has an average rating greater than 4 ---
// Needs to join 'restaurants_main' with 'restaurant_live_ratings'.
const pipeline_q5_split = [
  {
    $lookup: {
      from: "restaurant_live_ratings",
      localField: "restaurant_id",
      foreignField: "restaurant_id",
      as: "live_rating_info"
    }
  },
  { $unwind: "$live_rating_info" },
  {
    $group: {
      _id: "$address.country_name",
      avg_rating: { $avg: "$live_rating_info.aggregate_rating" }
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
// db.restaurants_main.aggregate(pipeline_q5_split);

// --- SQL Query 6 (in your list, which was highest-rated in each country): ---
// This is similar to Q3 but with aggregate_rating instead of votes.
const pipeline_q6_split = [
  {
    $lookup: {
      from: "restaurant_live_ratings",
      localField: "restaurant_id",
      foreignField: "restaurant_id",
      as: "live_rating_info"
    }
  },
  { $unwind: "$live_rating_info" },
  {
    $sort: {
      "address.country_name": 1,
      "live_rating_info.aggregate_rating": -1
    }
  },
  {
    $group: {
      _id: "$address.country_name",
      restaurant_name: { $first: "$restaurant_name" },
      aggregate_rating: { $first: "$live_rating_info.aggregate_rating" }
    }
  },
  { $sort: { _id: 1 } },
  {
    $project: {
      _id: 0,
      country: "$_id",
      restaurant_name: 1,
      aggregate_rating: 1
    }
  }
];
// db.restaurants_main.aggregate(pipeline_q6_split);


// --- SQL Query 7 (in your list, high rating AND many votes): ---
const pipeline_q7_split = [
  {
    // Start from restaurant_live_ratings as the primary filter criteria are there
    $match: {
      aggregate_rating: { $gt: 4.5 },
      votes: { $gt: 1000 }
    }
  },
  {
    // Lookup to get restaurant_name from restaurants_main
    $lookup: {
      from: "restaurants_main",
      localField: "restaurant_id",
      foreignField: "restaurant_id",
      as: "main_info"
    }
  },
  { $unwind: "$main_info" },
  {
    $project: {
      _id: 0,
      restaurant_name: "$main_info.restaurant_name",
      aggregate_rating: 1, // from restaurant_live_ratings
      votes: 1             // from restaurant_live_ratings
    }
  },
  {
    $sort: {
      aggregate_rating: -1,
      votes: -1
    }
  }
];
// db.restaurant_live_ratings.aggregate(pipeline_q7_split);

// --- SQL Query 8: Find near restaurants (Bounding Box & Custom Distance Metric version) ---
// This primarily uses restaurants_main for location and name.
// If distance or other metrics depended on live ratings, a lookup would be needed.
const targetLongitude_q8_sql_split = -78;
const targetLatitude_q8_sql_split = 38;
const minLongitude_sql_split = -82.5;
const maxLongitude_sql_split = -74.5;
const minLatitude_sql_split = 33;
const maxLatitude_sql_split = 44;

const pipeline_q8_alternative_split = [
  {
    $match: { // On restaurants_main
      $and: [
        { "location.coordinates.0": { $gte: minLongitude_sql_split, $lte: maxLongitude_sql_split } },
        { "location.coordinates.1": { $gte: minLatitude_sql_split, $lte: maxLatitude_sql_split } }
      ]
    }
  },
  {
    $project: {
      original_doc: "$$ROOT",
      extracted_longitude: { $arrayElemAt: ["$location.coordinates", 0] },
      extracted_latitude: { $arrayElemAt: ["$location.coordinates", 1] }
    }
  },
  {
    $match: {
      extracted_longitude: { $type: "double" },
      extracted_latitude: { $type: "double" }
    }
  },
  {
    $addFields: {
      restaurant_name: "$original_doc.restaurant_name",
      address: "$original_doc.address",
      location: "$original_doc.location",
      distance_metric: {
        $add: [
          { $pow: [ { $subtract: ["$extracted_longitude", targetLongitude_q8_sql_split] }, 2 ] },
          { $pow: [ { $subtract: ["$extracted_latitude", targetLatitude_q8_sql_split] }, 2 ] }
        ]
      }
    }
  },
  { $sort: { distance_metric: 1 } },
  { $limit: 10 }, // Assuming the SQL limit was 10, adjust if it was 5
  {
    $project: {
      _id: 0,
      restaurant_name: 1,
      "address.city": "$address.city",
      "address.country_name": "$address.country_name",
      longitude: "$extracted_longitude",
      latitude: "$extracted_latitude",
      distance_metric: { $round: ["$distance_metric", 2] }
    }
  }
];
// db.restaurants_main.aggregate(pipeline_q8_alternative_split);

// --- SQL Query 9: Get restaurants with the highest rating in each price range ---
// Assumes 'price_range' is in 'restaurants_main.rating_details'.
// Needs 'aggregate_rating' and 'votes' from 'restaurant_live_ratings'.
const pipeline_q9_split = [
  { // Start with restaurants_main to get price_range and other details
    $lookup: {
      from: "restaurant_live_ratings",
      localField: "restaurant_id",
      foreignField: "restaurant_id",
      as: "live_rating_info"
    }
  },
  { $unwind: "$live_rating_info" },
  {
    $sort: {
      "rating_details.price_range": 1, // From restaurants_main
      "live_rating_info.aggregate_rating": -1,
      "live_rating_info.votes": -1
    }
  },
  {
    $group: {
      _id: "$rating_details.price_range",
      restaurant_name: { $first: "$restaurant_name" },
      aggregate_rating: { $first: "$live_rating_info.aggregate_rating" },
      votes: { $first: "$live_rating_info.votes" }
    }
  },
  { $sort: { _id: 1 } },
  { $limit: 5 },
  {
    $project: {
      _id: 0,
      price_range: "$_id",
      restaurant_name: 1,
      aggregate_rating: 1,
      votes: 1
    }
  }
];
// db.restaurants_main.aggregate(pipeline_q9_split);

// --- SQL Query 10: Find the restaurant(s) with the highest rating in the database ---
const pipeline_q10_split = [
  { // Start from restaurant_live_ratings to find the max rating
    $group: {
      _id: null,
      max_overall_rating: { $max: "$aggregate_rating" },
      all_ratings_docs: { $push: "$$ROOT" }
    }
  },
  { $unwind: "$all_ratings_docs" },
  {
    $match: {
      $expr: { $eq: ["$all_ratings_docs.aggregate_rating", "$max_overall_rating"] }
    }
  },
  {
    $project: { // Project fields from restaurant_live_ratings needed for lookup/output
      _id: 0,
      restaurant_id: "$all_ratings_docs.restaurant_id",
      aggregate_rating: "$all_ratings_docs.aggregate_rating",
      votes: "$all_ratings_docs.votes"
    }
  },
  {
    $lookup: {
      from: "restaurants_main",
      localField: "restaurant_id",
      foreignField: "restaurant_id",
      as: "main_details"
    }
  },
  { $unwind: "$main_details" },
  {
    $project: {
      restaurant_name: "$main_details.restaurant_name",
      country: "$main_details.address.country_name",
      // city: "$main_details.address.city", // Optional
      aggregate_rating: 1, // from restaurant_live_ratings
      // votes: 1 // Optional, already have it
    }
  },
  { $sort: { country: 1, restaurant_name: 1 } }
];
// db.restaurant_live_ratings.aggregate(pipeline_q10_split);