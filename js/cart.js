import { getLocalStorage, setLocalStorage, updateCartBadge } from "./utils.mjs";
import ShoppingCart from "./ShoppingCart.mjs";

const LIST_SELECTOR = ".product-list";
const CLEAR_BTN = "#clear-cart-btn";
const CHECKOUT_BTN = "#checkout-btn";

function readCart() {
  const items = getLocalStorage("so-cart", []);
  return Array.isArray(items) ? items : [];
}
function writeCart(items) {
  setLocalStorage("so-cart", Array.isArray(items) ? items : []);
  updateCartBadge();
}

function mount() {
  const listEl = document.querySelector(LIST_SELECTOR);
  const view = new ShoppingCart(readCart(), listEl, (cart) => writeCart(cart));
  view.init();

  // Remove item buttons (delegated)
  listEl?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-remove");
    if (!btn) return;
    const li = btn.closest(".product-card");
    const id = li?.dataset?.id;
    if (!id) return;
    view.remove(id);
  });

  // Clear Cart
  const clearBtn = document.querySelector(CLEAR_BTN);
  clearBtn?.addEventListener("click", () => {
    view.clear();      // updates UI + totals
    writeCart([]);     // clears storage + badge
  });

  // Checkout
  const checkoutBtn = document.querySelector(CHECKOUT_BTN);
  checkoutBtn?.addEventListener("click", () => {
    const cartNow = readCart();
    if (!cartNow.length) return;
    window.location.href = "../checkout/index.html";
  });

  // Keep in sync across tabs
  window.addEventListener("storage", (ev) => {
    if (ev.key === "so-cart") view.set(readCart());
  });

  updateCartBadge();
}

document.addEventListener("DOMContentLoaded", mount);
