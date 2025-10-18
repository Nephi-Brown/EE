import { updateCartBadge, startCartBadgeEnforcer } from "./utils.mjs";

function findCartLink() {
  return (
    document.querySelector('[data-el="cart-link"]') ||
    document.querySelector(".cart-link") ||
    document.querySelector("#cart-link") ||
    document.querySelector('[aria-label*="cart" i]') ||
    document.querySelector('[aria-label*="basket" i]')
  );
}

function wireCartNav() {
  const link = findCartLink();
  if (!link) return;
  const target = "/cart/index.html";
  link.addEventListener("click", (e) => {
    if (link.tagName !== "A" || !link.getAttribute("href")) {
      e.preventDefault();
      location.href = target;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  startCartBadgeEnforcer();
  updateCartBadge();
  wireCartNav();
});
