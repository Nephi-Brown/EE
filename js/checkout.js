// js/checkout.js
import { getLocalStorage } from "./utils.mjs";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const LS_KEY = "priceOverrides";

/* ---------- shared price logic (matches cards/details/cart) ---------- */
function getOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; } catch { return {}; }
}
function getAssignedAvg(id) {
  const m = getOverrides();
  return m && id in m ? Number(m[id]) : null;
}
function numbersFromText(item) {
  const fields = [
    item?.info,
    item?.pleaseNote,
    item?.Name,
    item?.name,
    item?._embedded?.venues?.[0]?.boxOfficeInfo?.phoneNumberDetail,
    item?._embedded?.venues?.[0]?.boxOfficeInfo?.openHoursDetail,
    item?._embedded?.venues?.[0]?.generalInfo?.generalRule,
    item?._embedded?.venues?.[0]?.generalInfo?.childRule
  ].map((s) => (s || "").toString());
  const rx = /(£|gbp)\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const out = [];
  for (const s of fields) {
    if (!s) continue;
    let m;
    while ((m = rx.exec(s))) {
      const n = parseFloat(String(m[2]).replace(",", "."));
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}
function minMax(item) {
  const vals = [];
  const min1 = Number(item?.PriceMin ?? item?.FinalPrice ?? item?.Price);
  const max1 = Number(item?.PriceMax);
  if (Number.isFinite(min1) && min1 > 0) vals.push(min1);
  if (Number.isFinite(max1) && max1 > 0) vals.push(max1);
  const ranges = Array.isArray(item?.priceRanges) ? item.priceRanges : [];
  for (const r of ranges) {
    const a = Number(r?.min),
      b = Number(r?.max);
    if (Number.isFinite(a) && a > 0) vals.push(a);
    if (Number.isFinite(b) && b > 0) vals.push(b);
  }
  vals.push(...numbersFromText(item));
  const nums = vals.filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  const min = Math.min(...nums),
    max = Math.max(...nums);
  return { min, max };
}
function unitPrice(item) {
  const id = item?.Id || item?.id;
  const assigned = id ? getAssignedAvg(id) : null;         // ← primary source (what cards/details use)
  if (Number.isFinite(assigned) && assigned > 0) return assigned;

  const mm = minMax(item);                                  // ← fallback if no override saved
  if (!mm) return 0;
  if (Number.isFinite(mm.min) && Number.isFinite(mm.max)) return (mm.min + mm.max) / 2;
  if (Number.isFinite(mm.min)) return mm.min;
  if (Number.isFinite(mm.max)) return mm.max;
  return 0;
}

/* ---------- build inline order summary ---------- */
function buildSummary(cart) {
  const wrap = document.getElementById("checkout-cart-summary");
  if (!wrap) return;

  const itemsHTML = cart
    .map((it) => {
      const name = it?.Name || it?.name || "Event";
      const qty = Number(it?.quantity || 1);
      const unit = unitPrice(it);
      const line = unit * qty;
      return `<li>${name}, ${qty} × ${GBP.format(unit)} = <strong>${GBP.format(line)}</strong></li>`;
    })
    .join("");

  wrap.innerHTML = `
    <h4 style="margin-bottom:.5rem;">Your Order</h4>
    <ul style="list-style:none;padding:0;margin:0;display:grid;gap:.25rem;">
      ${itemsHTML}
    </ul>
  `;
}

/* ---------- totals: Sub-Total 93%, Tax 7%, Total matches cart ---------- */
function computeTotals(cart) {
  const total = cart.reduce((sum, it) => sum + unitPrice(it) * (Number(it?.quantity || 1)), 0);
  const sub = total * 0.93;
  const tax = total * 0.07;
  return { total, sub, tax };
}
function setTotals({ total, sub, tax }) {
  const subEl = document.getElementById("sub-value");
  const taxEl = document.getElementById("tax-value");
  const finEl = document.getElementById("fin-value");
  if (subEl) subEl.textContent = sub.toFixed(2);
  if (taxEl) taxEl.textContent = tax.toFixed(2);
  if (finEl) finEl.textContent = total.toFixed(2);
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const cart = getLocalStorage("so-cart") || [];
  buildSummary(cart);
  setTotals(computeTotals(cart));
});
