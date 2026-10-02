const db = require('../database/db');

async function getAllProducts() {
  return await db.getAllProducts();
}

async function getProductById(id) {
  return await db.getProductById(id);
}

async function createProduct(productData) {
  if (!productData || typeof productData.name !== 'string' || productData.name.trim() === '' || productData.price === undefined) {
    const error = new Error('Product must have a valid name and price');
    error.statusCode = 400;
    throw error;
  }
  return await db.createProduct({
    ...productData,
    name: productData.name.trim()
  });
}

async function updateProduct(id, productData) {
  if (!productData || typeof productData.name !== 'string' || productData.name.trim() === '' || productData.price === undefined) {
    const error = new Error('Product must have a valid name and price');
    error.statusCode = 400;
    throw error;
  }
  return await db.updateProduct(id, {
    ...productData,
    name: productData.name.trim()
  });
}

async function patchProduct(id, productData) {
  return await db.patchProduct(id, productData);
}

async function deleteProduct(id) {
  return await db.deleteProduct(id);
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct
};
