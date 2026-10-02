const fs = require('fs/promises');
const path = require('path');

const rootDbPath = path.resolve(__dirname, '../db.json');
const localDbPath = path.resolve(__dirname, 'db.json');

// Helper to read data from the database file
async function readData() {
  const filePath = rootDbPath;
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

// Helper to write data back to the database file
async function writeData(data) {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(rootDbPath, content, 'utf-8');
  try {
    await fs.writeFile(localDbPath, content, 'utf-8');
  } catch (err) {
    // If local path fails, ignore
  }
}

async function getAllProducts() {
  return await readData();
}

async function getProductById(id) {
  const products = await readData();
  const numId = Number(id);
  return products.find(p => p.id === numId || p.id == id) || null;
}

async function createProduct(productData) {
  const products = await readData();
  const maxId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
  const newProduct = {
    id: productData.id !== undefined ? Number(productData.id) : maxId + 1,
    name: productData.name,
    price: productData.price !== undefined ? Number(productData.price) : 0
  };
  products.push(newProduct);
  await writeData(products);
  return newProduct;
}

async function updateProduct(id, productData) {
  const products = await readData();
  const numId = Number(id);
  const index = products.findIndex(p => p.id === numId || p.id == id);
  if (index === -1) {
    return null;
  }
  const updatedProduct = {
    id: numId,
    name: productData.name,
    price: productData.price !== undefined ? Number(productData.price) : products[index].price
  };
  products[index] = updatedProduct;
  await writeData(products);
  return updatedProduct;
}

async function patchProduct(id, productData) {
  const products = await readData();
  const numId = Number(id);
  const index = products.findIndex(p => p.id === numId || p.id == id);
  if (index === -1) {
    return null;
  }
  const existing = products[index];
  const updatedProduct = {
    ...existing,
    ...productData,
    id: numId,
    price: productData.price !== undefined ? Number(productData.price) : existing.price
  };
  products[index] = updatedProduct;
  await writeData(products);
  return updatedProduct;
}

async function deleteProduct(id) {
  const products = await readData();
  const numId = Number(id);
  const index = products.findIndex(p => p.id === numId || p.id == id);
  if (index === -1) {
    return null;
  }
  const [deletedProduct] = products.splice(index, 1);
  await writeData(products);
  return deletedProduct;
}

module.exports = {
  readData,
  writeData,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct
};
