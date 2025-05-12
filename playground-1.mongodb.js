// The current database to use.
use("Restaurant_DB");

// MongoDB Equivalent Queries for slow_queries.sql
// This version defines each query's pipeline or find parameters as variables.

// Make sure to connect to your database first in mongosh:
// use your_zomato_db;
//
// Then, to run a query, use the defined variable, e.g.:
// db.restaurants.aggregate(pipeline_q1);
// db.restaurants.find(filter_q4, projection_q4).sort({ restaurant_name: 1 });
// db.restaurants.find(filter_q8, projection_q8).limit(5);
// etc.
//
// Ensure your collection name is correct (e.g., replace 'db.restaurants' if needed).

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

// SQL Query 4: Find restaurants by cuisine (e.g., Italian or Japanese)
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
  
  // SQL Query 8: Find 5 closest restaurants to a given location (e.g., Long: -78, Lat: 38)
  // First, ensure you have a 2dsphere index: db.restaurants.createIndex({ "location": "2dsphere" })
const pipeline_q8 = [
    {
        $geoNear: {
            near: {
                type: "Point",
                coordinates: [-78, 38]
            },
            distanceField: "distance",
            spherical: true
        }
    },
    {
        $project: {
            _id: 0,
            restaurant_name: 1,
            "address.city": 1,
            "address.country_name": 1,
            longitude: { $arrayElemAt: ["$location.coordinates", 0] },
            latitude: { $arrayElemAt: ["$location.coordinates", 1] }
        }
    },
    { $sort: { distance: 1 } },
    { $limit: 5 }
];

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

db.restaurants.aggregate(pipeline_q1);
  