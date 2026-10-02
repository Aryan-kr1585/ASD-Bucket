const productService = require('../services/productService');
const { invalidateCache } = require('../middleware/cacheMiddleware');

async function getAllProducts(req, res) {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
  }
}

async function createProduct(req, res) {
  try {
    const newProduct = await productService.createProduct(req.body);
    // Successfully modified stored data: invalidate cache entries that may contain stale data
    invalidateCache();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const updatedProduct = await productService.updateProduct(id, req.body);
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Successfully modified stored data: invalidate cache entries that may contain stale data
    invalidateCache(id);
    res.json(updatedProduct);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
  }
}

async function patchProduct(req, res) {
  try {
    const { id } = req.params;
    const updatedProduct = await productService.patchProduct(id, req.body);
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Successfully modified stored data: invalidate cache entries that may contain stale data
    invalidateCache(id);
    res.json(updatedProduct);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const deletedProduct = await productService.deleteProduct(id);
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Successfully modified stored data: invalidate cache entries that may contain stale data
    invalidateCache(id);
    res.json({ message: 'Product deleted successfully', product: deletedProduct });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct
};
