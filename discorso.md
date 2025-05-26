### **The Starting Point: The Zomato Dataset and SQL Structure**

* Our foundation is the Zomato dataset, rich with details like restaurant names, global locations, cuisines, ratings, pricing, etc.
* Initially, this data was modeled in a relational SQL database, normalized across several tables: `restaurants`, `restaurant_address`, `rating`, `coordinates`, and `countries`. This structure, established by our `setup.sql` script, is typical for SQL, aiming for data integrity and minimal redundancy.
* The core task of this project was to translate a set of 10 analytical SQL queries (from `slow_queries.sql`) into their NoSQL counterparts, but equally important, to understand the data modeling principles of document databases.

---

### **Initial NoSQL Approach: The Single Collection Model & NoSQL Advantages**

* When first moving to MongoDB, a very common and often efficient pattern for data like Zomato's – where information about a single "restaurant" entity is frequently accessed together – is to use a **single collection with embedded documents.**
    * Imagine a `restaurants` collection where each document contains all information: name, an embedded address object, a GeoJSON location object, an array for cuisines, and an embedded `rating_details` object.
* **Benefits of this embedded model:**
    * **Read Performance:** Fetching most details for a restaurant happens in one database operation, avoiding complex joins.
    * **Query Simplicity:** Many of our 10 SQL queries translate to simpler MongoDB queries without needing `$lookup` (MongoDB's JOIN equivalent).
* **Broader NoSQL Advantages – Beyond Simple Mapping:**
    * Choosing NoSQL like MongoDB isn't just about a different storage format; it's about **flexibility**.
    * **Diverse Data Types:** We could easily extend our model. For example, if we wanted to include **photos or short video clips from user reviews** for Zomato restaurants, a document model can handle this much more naturally than a rigid relational schema. We could embed references or even small binary data directly.
    * **Schema Evolution:** If only some high-end restaurants get "Michelin Stars," we can add this field just to those documents without altering a global table schema.
    * **Varied Structures:** Different restaurant types might have different amenities; a document model easily accommodates this.
* **Schema Validation in a "Schemaless" World:**
    * The term "schemaless" for NoSQL is a bit of a misnomer. It means the database *doesn't strictly enforce* a schema upfront for *all* documents. Your application, however, usually expects a certain structure.
    * To manage this, MongoDB offers **schema validation using `$jsonSchema`**. This allows us to define an expected structure, data types (like `int`, `string`, `array`, `double`), required fields, and even complex rules (like valid GeoJSON, or `enum` for country names).
    * Crucially, using `additionalProperties: true` within `$jsonSchema` (as we did in our setup scripts) gives us a balance: we enforce a core schema for known fields while still allowing documents to have *additional, unplanned fields*. This provides data integrity for our core structure plus the flexibility to evolve – a key advantage over the rigidity of traditional RDBMS.

---

### **Exploring a Split: The Two-Collection Model for Volatile Data**

* While a **single collection** can be very efficient for our specific 10 queries on this Zomato dataset, it's crucial to understand that this **isn't a universal 'best practice' for all NoSQL scenarios**. This is because in many real-world applications, data can be far more complex and less inherently cohesive than our restaurant dataset.

The beauty of NoSQL and document databases like MongoDB, lies in its **flexibility** to adapt the data model to the specific needs of the application and the nature of the data.

An example could be to consider a university database application. This system would handle distinct entities with different characteristics and relationships, that are better managed using many collections:

* **Students Collection**: Containing fields like student name, enrollment and grades details, etc.
* **Professors Collection**: With faculty information, research areas, courses taught.
* **Courses Collection**: Detailing course descriptions, schedules, prerequisites, and enrolled student IDs or professor IDs.
* **Departments Collection**: Information about academic departments.

* **Our Assumption:** Another example, that could adapt better to how single entity dataset, is to assume that `votes` and `aggregate_rating` are **frequently updated**, like many times per hour or per minute. It's better to store them in a separate collection because these fields could lead to many rewrite of large documents.
* **The Solution: Create a second collection**
    * We re-modeled our data into two collections:
        1.  `restaurants_main`: Holds more static info (name, address, location, cuisines, less volatile rating details like price range, rating text).
        2.  `restaurant_live_ratings`: A dedicated collection for `restaurant_id`, `aggregate_rating`, and `votes`.
* **Benefits (under our assumption):**
    * **Optimized Writes:** Updates to `votes` and `aggregate_rating` happen on small, dedicated documents, making writes faster.
    * **Stable Main Collection:** `restaurants_main` is updated less, potentially improving its cacheability.
* **Trade-off:**
    * **Lookups for Reads:** Queries needing both static info and live rating data now require a `$lookup`. In our case, about half of our 10 queries (6 to be precise) were impacted.

---

### **Collection Setup with Schema Validation (Two-Collection Model)**

* Using the `mongo_two_collection_setup` script, we formally defined the `$jsonSchema` for both `restaurants_main` and `restaurant_live_ratings`.
* **Key Validations Implemented:**
    * Correct `bsonType` for all fields.
    * `required` fields.
    * `enum` for `address.country_name` using the provided list.
    * `oneOf` logic for `location.coordinates` to allow either valid GeoJSON coordinate pairs or our `[400, 400]` marker for data imported with issues from the CSV.
    * `location.type` enforced as "Point".
* **Indexes Created:**
    * **`2dsphere` index** on `restaurants_main.location.coordinates` for efficient geospatial queries (like Query 8).
    * **Unique indexes** on `restaurant_id` in both collections for linking and data integrity.
    * **Indexes on frequently queried fields** like `address.country_name` and `cuisines` in `restaurants_main`.
    * For `restaurant_live_ratings`, a crucial index on `aggregate_rating` (descending) and `votes` (descending) was created. This index is vital for efficiently finding the highest-rated restaurants (like in Query 10), as it allows MongoDB to quickly access the top ratings without a full collection scan. The index on `restaurant_id` in this collection ensures uniqueness and aids in linking.

---

### **Adapting MongoDB Pipelines for the Two-Collection Model**

* With data split, queries needing information from both collections now use the `$lookup` stage.
* For example, Query 10 ("Find the restaurant(s) with the highest rating in the database") in the two-collection model:
    1.  Starts by finding the maximum `aggregate_rating` from `restaurant_live_ratings` (efficiently, thanks to its index).
    2.  Filters `restaurant_live_ratings` to get all entries matching this maximum.
    3.  Uses `$lookup` to fetch corresponding static details (like `restaurant_name`, `country`) from `restaurants_main` using `restaurant_id`.
    4.  Finally, projects and sorts the results.
* The `_id: "$address.country_name"` in a `$group` stage, for instance, clearly tells MongoDB to "group documents based on the value of the `country_name` field found within the `address` sub-document." This is the direct equivalent of SQL's `GROUP BY`.
* When projecting fields, `restaurant_name: 1` simply includes an existing top-level field, while something like `aggregate_rating: "$rating_details.aggregate_rating"` (in the single-collection model) or `aggregate_rating: "$live_rating_info.aggregate_rating"` (in the two-collection model after a lookup) creates a field in the output, taking its value from a specific path in the input document, effectively "promoting" or renaming it.

---

### **Data Import Process**

* After setting up the collections and schemas in `mongosh`, the data import from CSV requires an intermediate step.
* Our Python script (`migrate_to_mongo.py`) was adapted to generate two separate JSONL files:
    * `restaurants_main.jsonl`
    * `restaurant_live_ratings.jsonl`
* Each file's content conforms to the schema of its target collection.
* Then, `mongoimport` (a command-line utility, run from the system terminal, not `mongosh`) is used twice, once for each collection, ensuring the database name in the URI is correct. We learned that using the `--jsonArray` flag is only appropriate if the file is a single JSON array, not for JSONL files.

---

### **Conclusion & Justification of Modeling Choices**

* This project illustrates the journey from a relational model to various NoSQL modeling considerations with MongoDB.
* For our specific 10 analytical queries on the Zomato dataset, a **single embedded collection** is highly efficient for reads, minimizing lookups and leveraging data locality.
* However, NoSQL's strength lies in its **flexibility**. The ability to handle diverse data types (like embedded images/videos from reviews), evolve schemas with features like `additionalProperties: true` in `$jsonSchema`, and adapt to varied data structures offers significant advantages over traditional RDBMS.
* By **assuming data volatility** for rating information, we explored a **two-collection model**. This demonstrated:
    * The **Subset Pattern** for optimizing writes on frequently updated data.
    * The importance and implementation of **Schema Validation** for data integrity.
    * The use and impact of **`$lookup`** when data is distributed.
    * The critical role of **Indexes** (like `2dsphere` for geospatial, and compound indexes for sorting/filtering ratings) in query performance.
* The key takeaway is that NoSQL data modeling is about **understanding trade-offs** – balancing read performance, write performance, data redundancy, query complexity, and development agility – to choose the best structure for specific data characteristics and application requirements.

---

**(End of Speech - Q&A)**

"Thank you for your time. I'm now ready for any questions you might have."

---

This speech format allows you to guide your audience through your thought process and demonstrate a comprehensive understanding of the concepts. Remember to refer to your code artifacts (`mongo_collection_setup`, your pipeline definitions, Python script logic) as you go through each section. Good luck!