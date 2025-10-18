// My Events page controller
// Displays bookmarked events

import { getBookmarks, clearAllBookmarks } from './bookmarks.mjs';
import { loadHeaderFooter, renderListWithTemplate } from './utils.mjs';

// Load header and footer
loadHeaderFooter();

// Product card template for bookmarked events
function bookmarkedEventCardTemplate(event) {
  return `<li class="product-card">
    <a href="../product_pages/index.html?id=${event.id}">
      <img
        src="${event.images?.[0]?.url || '../images/placeholder.png'}"
        alt="${event.name}"
        loading="lazy"
      />
      <h3 class="card__brand">${event._embedded?.venues?.[0]?.name || 'Venue TBA'}</h3>
      <h2 class="card__name">${event.name}</h2>
      ${event.priceRanges ? `<p class="product-card__price">From £${event.priceRanges[0].min}</p>` : '<p class="product-card__price">Price TBA</p>'}
    </a>
    <button class="remove-bookmark-btn" data-id="${event.id}" aria-label="Remove from My Events">
      Remove
    </button>
  </li>`;
}

// Render bookmarked events
function renderBookmarks() {
  const bookmarks = getBookmarks();
  const listElement = document.querySelector('.product-list');
  const emptyState = document.getElementById('empty-state');
  const footer = document.getElementById('bookmarks-footer');

  if (bookmarks.length === 0) {
    // Show empty state
    listElement.innerHTML = '';
    emptyState.classList.remove('hidden');
    footer.classList.add('hidden');
  } else {
    // Show bookmarks
    emptyState.classList.add('hidden');
    footer.classList.remove('hidden');
    renderListWithTemplate(bookmarkedEventCardTemplate, listElement, bookmarks);

    // Attach remove button handlers
    attachRemoveHandlers();
  }
}

// Attach handlers to remove buttons
function attachRemoveHandlers() {
  const removeButtons = document.querySelectorAll('.remove-bookmark-btn');

  removeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const eventId = button.dataset.id;

      // Remove from bookmarks
      let bookmarks = getBookmarks();
      bookmarks = bookmarks.filter(event => event.id !== eventId);

      // Save and re-render
      localStorage.setItem('ee-bookmarks', JSON.stringify(bookmarks));
      renderBookmarks();
    });
  });
}

// Clear all bookmarks handler
document.getElementById('clear-bookmarks-btn')?.addEventListener('click', () => {
  if (confirm('Are you sure you want to remove all bookmarked events?')) {
    clearAllBookmarks();
    renderBookmarks();
  }
});

// Initial render
renderBookmarks();
