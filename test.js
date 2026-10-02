const app = require('./server');
const cacheMiddleware = require('./middleware/cacheMiddleware');
const fs = require('fs');
const assert = require('assert');

async function runTests() {
  const originalDb = fs.readFileSync('./db.json', 'utf-8');
  const server = app.listen(3006);
  const baseUrl = 'http://localhost:3006';

  try {
    console.log('1. Testing GET /products cache MISS on initial request...');
    let res = await fetch(`${baseUrl}/products`);
    let data = await res.json();
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'Initial GET should return X-Cache: MISS');
    assert(Array.isArray(data), 'GET /products should return an array');
    assert.strictEqual(data.length, 4, 'Initial database should have 4 products');

    console.log('2. Testing GET /products cache HIT on subsequent request...');
    res = await fetch(`${baseUrl}/products`);
    data = await res.json();
    assert.strictEqual(res.headers.get('x-cache'), 'HIT', 'Second GET should return X-Cache: HIT');

    console.log('3. Testing GET /products/:id cache MISS then HIT...');
    res = await fetch(`${baseUrl}/products/1`);
    data = await res.json();
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'First GET /products/1 should return X-Cache: MISS');
    assert.strictEqual(data.id, 1, 'Product ID should be 1');
    assert.strictEqual(data.name, 'Keyboard');

    res = await fetch(`${baseUrl}/products/1`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT', 'Second GET /products/1 should return X-Cache: HIT');

    console.log('4. Testing GET /products/:id for non-existent item (404 Not Found & not cached)...');
    res = await fetch(`${baseUrl}/products/9999`);
    assert.strictEqual(res.status, 404, 'Non-existent item should return 404');
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', '404 response should have X-Cache: MISS');
    // Ensure 404 was not cached
    assert(!cacheMiddleware.cache.has('/products/9999'), '404 response should not be cached');

    console.log('5. Testing POST /products invalidates /products cache...');
    // Ensure /products is cached (HIT)
    res = await fetch(`${baseUrl}/products`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT');

    res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Headphones', price: 99.99 })
    });
    assert.strictEqual(res.status, 201, 'POST should return status 201');
    const createdProduct = await res.json();
    assert.strictEqual(createdProduct.name, 'Headphones');

    // /products must now be a MISS because it was invalidated
    res = await fetch(`${baseUrl}/products`);
    data = await res.json();
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'GET /products should be MISS after POST');
    assert(data.some(p => p.id === createdProduct.id), 'Newly created product should be present in database list');
    assert.strictEqual(data.length, 5, 'Database list should now have 5 items');

    // /products/1 should still be a HIT because it was unaffected
    res = await fetch(`${baseUrl}/products/1`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT', '/products/1 should remain HIT after POST');

    console.log('6. Testing PUT /products/:id invalidates only stale entries (/products and /products/:id)...');
    // Ensure /products/2 is cached
    res = await fetch(`${baseUrl}/products/2`);
    assert.strictEqual(res.headers.get('x-cache'), 'MISS');
    res = await fetch(`${baseUrl}/products/2`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT');

    // Ensure /products is cached
    await fetch(`${baseUrl}/products`);

    // PUT update product 2
    res = await fetch(`${baseUrl}/products/2`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Wireless Mouse', price: 29.99 })
    });
    assert.strictEqual(res.status, 200, 'PUT should return status 200');

    // /products/2 must now be MISS
    res = await fetch(`${baseUrl}/products/2`);
    data = await res.json();
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'GET /products/2 should be MISS after PUT');
    assert.strictEqual(data.name, 'Wireless Mouse');

    // /products collection must now be MISS
    res = await fetch(`${baseUrl}/products`);
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'GET /products should be MISS after PUT');

    // /products/1 must STILL be HIT (unaffected item not invalidated)
    res = await fetch(`${baseUrl}/products/1`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT', '/products/1 must remain cached (HIT)');

    console.log('7. Testing PATCH /products/:id invalidates stale entries...');
    // Cache /products/1
    await fetch(`${baseUrl}/products/1`);
    await fetch(`${baseUrl}/products`);

    res = await fetch(`${baseUrl}/products/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 59.99 })
    });
    assert.strictEqual(res.status, 200, 'PATCH should return status 200');

    res = await fetch(`${baseUrl}/products/1`);
    data = await res.json();
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'GET /products/1 should be MISS after PATCH');
    assert.strictEqual(data.price, 59.99);

    res = await fetch(`${baseUrl}/products`);
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'GET /products should be MISS after PATCH');

    console.log('8. Testing DELETE /products/:id invalidates stale entries...');
    // Cache product before deletion
    await fetch(`${baseUrl}/products/${createdProduct.id}`);
    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT');
    await fetch(`${baseUrl}/products`);

    res = await fetch(`${baseUrl}/products/${createdProduct.id}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200, 'DELETE should return status 200');

    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert.strictEqual(res.status, 404, 'Deleted product should return 404');

    res = await fetch(`${baseUrl}/products`);
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'GET /products should be MISS after DELETE');

    console.log('9. Testing failed mutation does NOT invalidate cache...');
    // Warm up /products cache
    await fetch(`${baseUrl}/products`);
    res = await fetch(`${baseUrl}/products`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT');

    // Invalid POST (missing required fields)
    res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true })
    });
    assert.strictEqual(res.status, 400, 'Invalid POST should return 400 Bad Request');

    // Cache should NOT be invalidated because data was not modified!
    res = await fetch(`${baseUrl}/products`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT', 'Cache should remain HIT after failed modification');

    console.log('10. Testing TTL (Time to Live) of 1 minute expiration & fresh re-fetch...');
    // Cache /products/3
    await fetch(`${baseUrl}/products/3`);
    res = await fetch(`${baseUrl}/products/3`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT');

    const entry = cacheMiddleware.cache.get('/products/3');
    assert(entry && typeof entry.createdAt === 'number', 'Cache entry must record createdAt timestamp');

    // Simulate passage of 61 seconds (older than 1 minute)
    entry.createdAt = Date.now() - 61000;

    // Next request checks whether older than 1 minute -> expired -> MISS
    res = await fetch(`${baseUrl}/products/3`);
    assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'Expired cache entry must return MISS');

    // Fresh value fetched from database should now be cached with fresh timestamp
    const freshEntry = cacheMiddleware.cache.get('/products/3');
    assert(freshEntry.createdAt > Date.now() - 1000, 'Fresh entry should have new timestamp');

    // Subsequent request should HIT
    res = await fetch(`${baseUrl}/products/3`);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT', 'Freshly cached entry should return HIT');

    console.log('\n========================================');
    console.log('ALL 10 COMPREHENSIVE TEST CASES CLEARED!');
    console.log('========================================');
  } finally {
    // Restore db.json
    fs.writeFileSync('./db.json', originalDb, 'utf-8');
    fs.writeFileSync('./database/db.json', originalDb, 'utf-8');
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
