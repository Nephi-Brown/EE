export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function getLocalStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return key === "so-cart" ? (Array.isArray(data) ? data : []) : data;
  } catch {
    return key === "so-cart" ? [] : null;
  }
}

export function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function setClick(selector, callback) {
  const el = qs(selector);
  if (!el) return;
  el.addEventListener("touchend", (event) => {
    event.preventDefault();
    callback();
  });
  el.addEventListener("click", callback);
}

export function getParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

export function renderListWithTemplate(templateFn, parentElement, list, position = "afterbegin", clear = false) {
  const parent = typeof parentElement === "string" ? document.querySelector(parentElement) : parentElement;
  if (!parent) return;
  if (clear) parent.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    parent.insertAdjacentHTML(position, "<p>No products found.</p>");
    return;
  }
  const htmlStrings = list.map(templateFn);
  parent.insertAdjacentHTML(position, htmlStrings.join(""));
}

export function renderWithTemplate(template, parentElement, callback) {
  if (!parentElement) return;
  parentElement.innerHTML = template;
  if (callback) callback();
}

export async function loadTemplate(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load template: ${path}`);
  return await res.text();
}

export async function loadHeaderFooter() {
  const head = document.querySelector("#main-head");
  const foot = document.querySelector("#main-foot");
  if (head) {
    const headerTemplate = await loadTemplate("/partials/header.html");
    renderWithTemplate(headerTemplate, head, updateCartBadge);
  }
  if (foot) {
    const footerTemplate = await loadTemplate("/partials/footer.html");
    renderWithTemplate(footerTemplate, foot);
  }
}

function findCartLink() {
  return (
    document.querySelector(".cart-btn") ||
    document.querySelector('[data-el="cart-link"]') ||
    document.querySelector(".cart-link") ||
    document.querySelector("#cart-link") ||
    document.querySelector('[aria-label*="cart" i]') ||
    document.querySelector('[href*="/cart/"]')
  );
}

function ensureCartBadge() {
  const cartLink = findCartLink();
  if (!cartLink) return null;
  let badge = cartLink.querySelector(".cart-count") || cartLink.querySelector("#cart-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "cart-count hide";
    badge.setAttribute("aria-live", "polite");
    badge.setAttribute("aria-atomic", "true");
    badge.textContent = "0";
    cartLink.appendChild(badge);
  }
  return badge;
}

export function updateCartBadge() {
  const cart = getLocalStorage("so-cart") || [];
  const totalCount = cart.reduce((sum, item) => sum + (item?.quantity || 1), 0);
  const badge = document.querySelector(".cart-count") || document.querySelector("#cart-badge") || ensureCartBadge();
  if (!badge) return;
  badge.textContent = String(totalCount);
  if (totalCount > 0) badge.classList.remove("hide");
  else badge.classList.add("hide");
}

export function startCartBadgeEnforcer() {
  let raf = 0;
  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      ensureCartBadge();
      updateCartBadge();
    });
  };

  let tries = 0;
  const maxTries = 10;
  const retry = () => {
    schedule();
    if (!findCartLink() && tries < maxTries) {
      tries += 1;
      setTimeout(retry, 150);
    }
  };

  document.addEventListener("DOMContentLoaded", schedule, { once: true });
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "so-cart") schedule();
  });

  retry();
}

export function bounceCartIcon() {
  const cartIcon = document.querySelector(".cart");
  if (!cartIcon) return;
  cartIcon.classList.remove("cart-bounce");
  void cartIcon.offsetWidth;
  cartIcon.classList.add("cart-bounce");
}

export function alertMessage(message, scroll = true) {
  const alert = document.createElement("div");
  const main = document.querySelector("main");
  alert.classList.add("alert");
  alert.innerHTML = `<h2>${message}</h2><button id='alert-close'>&times;</button>`;
  alert.addEventListener("click", function (e) {
    if (e.target.id === "alert-close") main.removeChild(this);
  });
  main.prepend(alert);
  if (scroll) window.scrollTo(0, 0);
}

export function removeAllAlerts() {
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach((alert) => document.querySelector("main").removeChild(alert));
}

export function showSkeletonLoaders(parentElement, count = 6) {
  const parent = typeof parentElement === "string" ? document.querySelector(parentElement) : parentElement;
  if (!parent) return;
  parent.innerHTML = "";
  for (let i = 0; i < count; i++) parent.insertAdjacentHTML("beforeend", skeletonCardTemplate());
}

export function skeletonCardTemplate() {
  return `
    <div class="skeleton-card">
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text medium"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>
  `;
}

export function showErrorState(parentElement, error, retryCallback) {
  const parent = typeof parentElement === "string" ? document.querySelector(parentElement) : parentElement;
  if (!parent) return;
  const errorMessage = error?.message || "Something went wrong. Please try again.";
  parent.innerHTML = `
    <div class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2>Oops! Something went wrong</h2>
      <p>${errorMessage}</p>
      ${retryCallback ? '<button class="btn-retry">Try Again</button>' : ""}
    </div>
  `;
  if (retryCallback) {
    const retryBtn = parent.querySelector(".btn-retry");
    if (retryBtn) retryBtn.addEventListener("click", retryCallback);
  }
}

export function showEmptyState(parentElement, message = "No events found") {
  const parent = typeof parentElement === "string" ? document.querySelector(parentElement) : parentElement;
  if (!parent) return;
  parent.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h2>No Events Found</h2>
      <p>${message}</p>
    </div>
  `;
}
