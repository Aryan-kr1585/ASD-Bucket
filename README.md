# ASD-Bucket: Layered Express Application with Caching Middleware

A modular, layered Express application featuring in-memory caching with a 1-minute TTL (Time to Live), cache HIT/MISS headers, and automatic cache invalidation upon data mutation.

## Architecture

The project follows a 5-layer architecture:
$$\text{Route} \longrightarrow \text{Middleware} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Database}$$

```
ASD/
├── database/
│   ├── db.js              # Persistence layer reading & writing db.json
│   ├── db.json            # Database storage
│   └── index.js           # Re-exports db module
├── services/
│   ├── productService.js  # Business logic & data validation
│   └── index.js           # Re-exports service module
├── middleware/
│   ├── cacheMiddleware.js # Caching middleware, TTL management & cache invalidation
│   └── index.js           # Re-exports cache middleware
├── controllers/
│   ├── productController.js # HTTP request/response handling & cache invalidation triggers
│   └── index.js           # Re-exports controller module
├── routes/
│   ├── productRoutes.js   # Route definitions mounting cacheMiddleware & controllers
│   └── index.js           # Re-exports routes
├── server.js              # Application entry point
├── db.json                # Root database storage (kept in sync)
└── test.js                # Integration test suite
```

## Features

- **Caching Middleware**: Applied to `GET /products` and `GET /products/:id`.
- **Cache Headers**: Sends `X-Cache: HIT` on cache hits and `X-Cache: MISS` on cache misses.
- **TTL (Time to Live)**: 1-minute expiration for cached data. Expired entries are discarded and fresh values are fetched from the database.
- **Cache Invalidation**:
  - `POST /products`: Invalidates `/products` cache so new items immediately appear.
  - `PUT /products/:id`, `PATCH /products/:id`, `DELETE /products/:id`: Invalidates stale entries (both `/products` and the specific `/products/:id` item) while preserving unaffected items.

## Running the Application

```bash
# Start server
npm run server
```

The server listens on `http://localhost:3005`.

## Running Tests

```bash
npm test
```
# ASD-Bucket
