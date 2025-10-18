# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Edinburgh Entertainment (EE)** is a local events website built as a WDD330 student project. It allows users to browse events by category (Music, Theatre, Cinema, Sport), view event details, add events to a shopping cart, and complete checkout.

The project is part of the broader "SleepOutside" course project but has been customized for event ticketing in Edinburgh, Scotland.

## Development Commands

From the parent directory (`wdd330/`):

- `npm run start` - Start Vite dev server with hot reload
- `npm run build` - Build production files (outputs to `dist/`)
- `npm run lint` - Run ESLint on JavaScript files
- `npm run format` - Auto-format code with Prettier
- `npm run test` - Run Jest tests

## Architecture

### Module System

The codebase uses **ES6 modules** (.mjs files) with a class-based architecture pattern:

**Core Service Classes:**
- `ExternalServices.mjs` - API integration layer for Ticketmaster API
- `ProductData` class handles all external data fetching and checkout operations
- Uses environment variables for API keys (VITE_TICKETMASTER_API_KEY, VITE_EVENTBRITE_TOKEN)
- Maps categories (music, theatre, sports, cinema) to Ticketmaster segment IDs
- Cinema category uses keyword fallback ('&keyword=film') when no segment ID available

**UI Component Classes:**
- `ProductList.mjs` - Renders event listings with filtering, sorting, quick-view modal, and bookmark integration
- `ProductDetails.mjs` - Displays individual event details and handles add-to-cart
- `ShoppingCart.mjs` - Renders cart items with quantity controls and pricing
- `CheckoutProcess.mjs` - Handles checkout form submission and order processing

**Utilities:**
- `utils.mjs` - Core utilities (getLocalStorage/setLocalStorage, renderListWithTemplate, updateCartBadge, alertMessage)
- `bookmarks.mjs` - Bookmark management module (getBookmarks, addBookmark, removeBookmark, toggleBookmark, isBookmarked)

**Feature Modules:**
- `banner.js` - Banner notification system with featured event promotions, localStorage-based 24-hour dismissal tracking, and "Book Now" CTA integration

**Page Controllers:**
- `product-listing.js` - Handles category-based event listings
- `event-listing.js` - Handles search results page
- `my-events.js` - Displays user's bookmarked events
- `register.js` - Registration form submission with localStorage persistence

### Data Flow

1. **Event Listing**: `ProductList` → `ExternalServices.getData()` → Ticketmaster API → render cards with bookmark buttons
2. **Event Details**: URL params (`?category=music&id=xxx`) → `ProductDetails` → modal or page view
3. **Cart Management**: Add to cart → localStorage (`so-cart`) → `ShoppingCart` renders → badge updates
4. **Checkout**: Form submission → `CheckoutProcess` → `ExternalServices.checkout()` → success page
5. **Search**: Search form → `/search_results/?query=term` → `event-listing.js` → `ProductList` with query filter
6. **Bookmarks**: Star button click → `toggleBookmark()` → localStorage (`ee-bookmarks`) → My Events page displays saved events

### Vite Configuration

**Build configuration is now functional** (`/Users/gordonmclennan/repos/ee/wdd330/vite.config.js`):

- `root: 'EE/'` - Build root is the EE subdirectory
- Multi-page entry points configured:
  - main (index.html)
  - cart, checkout, success
  - product_listing, product_pages, search_results
  - register_page
  - my_events (bookmark page)
- Build output: `../dist/`
- Run `npm run build` from wdd330/ directory to build production files

### Page Structure

Multi-page application with separate HTML files:
- `index.html` - Homepage with category icons
- `product_listing/` - Event category listings (controlled by `product-listing.js`)
- `product_pages/` - Individual event detail pages
- `cart/` - Shopping cart view
- `checkout/` - Checkout form and success page
- `register_page/` - User registration
- `search_results/` - Search functionality (controlled by `event-listing.js`)
- `my_events/` - Bookmarked events page (controlled by `my-events.js`)

Each page includes navigation header with search bar, My Events link, and cart icon.

### State Management

**LocalStorage Keys:**
- `so-cart` - Array of cart items with quantities
- `order` - Completed order data
- `num-items` - Total item count (used for shipping calculations)
- `ee-bookmarks` - Array of bookmarked event objects
- `ee-registrations` - Array of registration submissions with timestamp, name, email, and phone
- `bannerDismissed` - Timestamp (milliseconds) when banner was last dismissed (24-hour cooldown)
- `hasVisitedBefore` - Welcome modal display flag
- `last-category` - Breadcrumb navigation memory

Cart items store both API data and calculated fields (`_finalPrice`, `_discountPct`, `_comparePrice`).

Bookmarked events store the complete event object from Ticketmaster API for offline access.

Registration data includes timestamp for potential future analytics or event association features.

### Styling

Progressive enhancement approach:
- `normalize.css` - CSS reset
- `base.css` - Mobile-first base styles with animations (@keyframes: cart-bounce, badge-pulse, badge-pop, fadeIn, animatetop)
- `larger.css` - Desktop responsive styles
- `form.css` - Form-specific styles with reduced motion support

**Animation System:**
- Product card hover effects with scale transforms and shadow elevation
- Fly-to-cart animation using element cloning and CSS transitions (ProductDetails.mjs)
- Cart badge bounce/pulse animations on add-to-cart actions
- Reduced motion accessibility via CSS media query `@media (prefers-reduced-motion: reduce)`

## Environment Configuration

**Required .env file** (repository root: `/Users/gordonmclennan/repos/ee/.env`):

```
VITE_TICKETMASTER_API_KEY=your_ticketmaster_key_here
VITE_EVENTBRITE_TOKEN=your_eventbrite_token_here
```

**Important configuration notes:**
- Variables must use `VITE_` prefix to be accessible in client-side code via Vite
- Access in code: `import.meta.env.VITE_TICKETMASTER_API_KEY`
- .env file is in .gitignore to prevent committing credentials to version control
- Keys remain visible in built client code - this secures source control, not runtime execution

**Files using environment variables:**
- `ExternalServices.mjs` (line 17) - VITE_TICKETMASTER_API_KEY
- `ticketmaster.js` - VITE_TICKETMASTER_API_KEY
- `eventdata1.js` - VITE_EVENTBRITE_TOKEN

## Known Issues & Quirks

1. **Mixed Terminology**: Code references "products" instead of "events" (legacy from SleepOutside boilerplate)
2. **Cinema Category Limitation**: Uses keyword search ('&keyword=film') instead of dedicated Ticketmaster segment ID, may return mixed results including film festivals and events with "film" in the name
3. **Eventbrite Placeholder**: `eventbriteURL` variable exists but is empty (line 3 of ExternalServices.mjs) - future integration point for dedicated cinema API
4. **Missing Features for Build**: Some HTML files reference `bookEvent.js` which doesn't exist - this reference is commented out to allow builds to succeed. banner.js has been implemented and is now active.

## Development Notes

### Search Implementation
- Search form uses class selectors (`.search-input`, `.search-btn`, `.search-bar`)
- Search handler in `main.js` waits for header to load before attaching listeners
- Search redirects to `/search_results/index.html?query=term`
- `event-listing.js` controller instantiates ProductList with query parameter
- ProductList filters results client-side using built-in query filter

### Bookmark System
- Star icons: ★ (filled, unicode 9733) for bookmarked, ☆ (outline, unicode 9734) for not bookmarked
- Toggle functionality integrated into ProductList.mjs via event delegation
- Bookmark data stored as complete event objects in localStorage (`ee-bookmarks`)
- My Events page reuses ProductList component to render bookmarked events
- Bookmark state persists across sessions until localStorage is cleared

### Banner Notification System
- Displays featured events on homepage with "Don't Miss Out!" CTA
- Fetches events from Ticketmaster API and selects highest-priced event automatically
- localStorage key `bannerDismissed` tracks 24-hour cooldown between displays
- "Book Now" button adds featured event directly to cart using ProductDetails class
- Dismiss button stores timestamp and hides banner until cooldown expires
- Integrates with existing cart system for seamless add-to-cart flow

### Animation Features
- **Fly-to-cart**: Element cloning animation from product image to cart icon with bezier curve transitions
- **Product card hover**: Scale transform (1.02) with elevated shadow on hover
- **Cart badge animations**: Bounce, pulse, and pop keyframe animations on cart updates
- **Reduced motion support**: All animations respect `prefers-reduced-motion` media query for accessibility
- **Performance**: Uses CSS transitions and transforms for GPU-accelerated animations

### Registration System
- Form submission persists data to localStorage (`ee-registrations` array)
- Data structure includes: timestamp, name, email, phone, and optional eventId from URL
- Success message displays navigation links to browse events, cart, and saved events
- Supports future features: analytics tracking, event-specific registrations, email reminders

### Build Process
- Run `npm run build` from `/Users/gordonmclennan/repos/ee/wdd330/` directory
- Vite root is `EE/` subdirectory, not repository root
- Build output goes to `wdd330/dist/`
- All entry points must have corresponding HTML files or build will fail

### Other Implementation Details
- Modal quick-view feature is embedded in ProductList with event delegation
- Cart badge updates are tied to header template loading
- Checkout calculates 6% tax and $2/item + $8 base shipping
- ProductList class accepts optional query parameter for search filtering
