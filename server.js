const express = require('express');
const productRoutes = require('./routes/productRoutes');

const app = express();
const port = 3005;

// Parse JSON request bodies
app.use(express.json());

// Routes
app.use('/products', productRoutes);

let server;
if (require.main === module) {
  server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
} else {
  // If imported as module, allow port to listen if not in test environment
  if (process.env.AUTO_LISTEN === 'true') {
    server = app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  }
}

module.exports = app;
