// Event listing page controller for search results
// Handles display of search results

import ProductData from './ExternalServices.mjs';
import ProductList from './ProductList.mjs';
import { getParam, updateCartBadge } from './utils.mjs';

// Update cart badge on page load
updateCartBadge();

// Get search query from URL parameter
const query = getParam('query') || getParam('q');

// Get category if specified, otherwise search all categories
const category = getParam('category') || 'music'; // Default to music for now

// Initialize product data source
const dataSource = new ProductData(category);

// Get the product list element
const listElement = document.querySelector('.product-list');

// Create and initialize the product list with search query
if (listElement && query) {
  const productList = new ProductList(category, dataSource, listElement, query);
  productList.init();
} else if (listElement) {
  // No query provided, show all events
  const productList = new ProductList(category, dataSource, listElement);
  productList.init();
}
