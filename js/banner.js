// Banner Notification System
// Displays featured event promotions with localStorage-based dismissal

import ProductData from './ExternalServices.mjs';
import { getParam, setLocalStorage, getLocalStorage } from './utils.mjs';

const BANNER_DISMISS_KEY = 'bannerDismissed';
const BANNER_COOLDOWN_MS = 86400000; // 24 hours in milliseconds

/**
 * Format date for display
 */
function formatEventDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Extract event date from Ticketmaster API format
 */
function getEventDate(event) {
  if (event.dates && event.dates.start) {
    return event.dates.start.dateTime || event.dates.start.localDate;
  }
  return null;
}

/**
 * Get event price for display
 */
function getEventPrice(event) {
  if (event.priceRanges && event.priceRanges.length > 0) {
    const minPrice = event.priceRanges[0].min;
    const maxPrice = event.priceRanges[0].max;
    if (minPrice && maxPrice && minPrice !== maxPrice) {
      return `£${minPrice} - £${maxPrice}`;
    } else if (minPrice) {
      return `From £${minPrice}`;
    }
  }
  return 'Check website for pricing';
}

/**
 * Select featured event from event list
 * Priority: highest price, or first event if no price data
 */
function selectFeaturedEvent(events) {
  if (!events || events.length === 0) return null;

  // Try to find event with highest price
  const eventsWithPrice = events.filter(event =>
    event.priceRanges && event.priceRanges.length > 0 && event.priceRanges[0].max
  );

  if (eventsWithPrice.length > 0) {
    return eventsWithPrice.reduce((highest, current) => {
      const currentMax = current.priceRanges[0].max;
      const highestMax = highest.priceRanges[0].max;
      return currentMax > highestMax ? current : highest;
    });
  }

  // Fallback to first event
  return events[0];
}

/**
 * Check if banner should be shown
 */
function shouldShowBanner() {
  const dismissed = getLocalStorage(BANNER_DISMISS_KEY);

  if (!dismissed) {
    return true;
  }

  // Check if cooldown period has passed
  const dismissedTime = Number(dismissed);
  const timeSinceDismiss = Date.now() - dismissedTime;

  return timeSinceDismiss >= BANNER_COOLDOWN_MS;
}

/**
 * Close/dismiss the banner
 */
function closeBanner() {
  const banner = document.getElementById('meetGreetBanner');
  if (banner) {
    banner.classList.add('hidden');
    setLocalStorage(BANNER_DISMISS_KEY, Date.now().toString());
  }
}

/**
 * Add featured event to cart and redirect to checkout
 */
async function bookFeaturedEvent(event) {
  try {
    // Import cart utilities
    const { default: ProductDetails } = await import('./ProductDetails.mjs');

    // Create a ProductDetails instance with the event
    const productDetails = new ProductDetails(event, null);

    // Add to cart
    await productDetails.addProductToCart();

    // Close banner
    closeBanner();

    // Redirect to cart with message
    window.location.href = '/cart/index.html?featured=true';
  } catch (error) {
    console.error('Error booking featured event:', error);
    // Still close banner and redirect to event details
    closeBanner();
    window.location.href = `/product_pages/index.html?category=music&id=${event.id}`;
  }
}

/**
 * Display the banner with featured event
 */
async function showBanner() {
  // Only run on homepage
  if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
    return;
  }

  // Check if banner should be shown
  if (!shouldShowBanner()) {
    return;
  }

  try {
    // Fetch music events (typically have highest prices)
    const dataSource = new ProductData('music');
    const events = await dataSource.getData();

    if (!events || events.length === 0) {
      return;
    }

    // Select featured event
    const featured = selectFeaturedEvent(events);

    if (!featured) {
      return;
    }

    // Get banner elements
    const banner = document.getElementById('meetGreetBanner');
    const message = document.getElementById('bannerMessage');

    if (!banner || !message) {
      return;
    }

    // Format event details
    const eventName = featured.name || 'Featured Event';
    const eventDate = getEventDate(featured);
    const eventPrice = getEventPrice(featured);
    const dateDisplay = eventDate ? formatEventDate(eventDate) : '';

    // Create banner content
    message.innerHTML = `
      <span class="banner-emoji">🎉</span>
      <span class="banner-text">
        <strong>Don't Miss Out!</strong> ${eventName}
        ${dateDisplay ? `<span class="banner-date"> · ${dateDisplay}</span>` : ''}
        ${eventPrice ? `<span class="banner-price"> · ${eventPrice}</span>` : ''}
      </span>
      <button id="bannerBookNow" class="banner-book-btn">Book Now</button>
    `;

    // Show banner
    banner.classList.remove('hidden');

    // Setup event listeners
    const closeBtn = banner.querySelector('.close-btn');
    const bookBtn = document.getElementById('bannerBookNow');

    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        closeBanner();
      };
    }

    if (bookBtn) {
      bookBtn.onclick = (e) => {
        e.preventDefault();
        bookFeaturedEvent(featured);
      };
    }

  } catch (error) {
    console.error('Error showing banner:', error);
  }
}

// Initialize banner when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showBanner);
} else {
  showBanner();
}

// Export for potential external use
export { closeBanner, showBanner };
