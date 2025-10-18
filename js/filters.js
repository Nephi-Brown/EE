const DEBOUNCE_MS = 200;

function parseUKDate(v) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
  const m = String(v).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isFinite(d.getTime()) ? d : null;
}

function readDate(input) {
  if (!input) return null;
  if (input.type === "date" && input.value) return new Date(input.value);
  return parseUKDate(input.value);
}

function readNumber(input) {
  if (!input) return null;
  const n = parseFloat(String(input.value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function findDateInputs() {
  const fieldsets = Array.from(document.querySelectorAll("fieldset"));
  for (const fs of fieldsets) {
    const legend = fs.querySelector("legend");
    if (legend && /date/i.test(legend.textContent)) {
      const inputs = Array.from(fs.querySelectorAll("input"));
      if (inputs.length >= 2) return { from: inputs[0], to: inputs[1] };
    }
  }
  const dates = Array.from(document.querySelectorAll('input[type="date"]'));
  return { from: dates[0] || null, to: dates[1] || null };
}

function findPriceInputs() {
  const fieldsets = Array.from(document.querySelectorAll("fieldset"));
  for (const fs of fieldsets) {
    const legend = fs.querySelector("legend");
    if (legend && /price/i.test(legend.textContent)) {
      const inputs = Array.from(fs.querySelectorAll("input"));
      if (inputs.length >= 2) return { min: inputs[0], max: inputs[1] };
      if (inputs.length === 1) return { min: inputs[0], max: null };
    }
  }
  const nums = Array.from(document.querySelectorAll('input[type="number"]'));
  return { min: nums[0] || null, max: nums[1] || null };
}

function withinDate(card, from, to) {
  const iso = card.dataset.date || "";
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  if (from && t < from.getTime()) return false;
  if (to) {
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
    if (t > end) return false;
  }
  return true;
}

function withinPrice(card, min, max) {
  const raw = card.dataset.avg;
  if (raw === "" || raw == null) return min == null && max == null ? true : false;
  const avg = Number(raw);
  if (!Number.isFinite(avg)) return min == null && max == null ? true : false;
  if (min != null && avg < min) return false;
  if (max != null && avg > max) return false;
  return true;
}

function updateCount(shown) {
  const candidates = Array.from(document.querySelectorAll("h1, h2, h3, .breadcrumb, .breadcrumbs, nav, .page-title, .section-title, .subheader, .header"));
  for (const el of candidates) {
    const txt = el.textContent || "";
    if (/\(\d+\s+items?\)/i.test(txt)) {
      el.textContent = txt.replace(/\(\d+\s+items?\)/i, `(${shown} items)`);
      return;
    }
  }
}

function applyFilters() {
  const list = document.querySelector(".product-list");
  if (!list) return;

  const { from: fromEl, to: toEl } = findDateInputs();
  const { min: minEl, max: maxEl } = findPriceInputs();

  const fromDate = readDate(fromEl);
  const toDate = readDate(toEl);
  const minPrice = readNumber(minEl);
  const maxPrice = readNumber(maxEl);

  const cards = Array.from(list.querySelectorAll(".product-card"));
  let shown = 0;
  for (const li of cards) {
    const ok = withinDate(li, fromDate, toDate) && withinPrice(li, minPrice, maxPrice);
    li.style.display = ok ? "" : "none";
    if (ok) shown++;
  }
  updateCount(shown);
}

function debounce(fn, ms) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function bind() {
  const inputs = [];
  const d = findDateInputs();
  if (d.from) inputs.push(d.from);
  if (d.to) inputs.push(d.to);
  const p = findPriceInputs();
  if (p.min) inputs.push(p.min);
  if (p.max) inputs.push(p.max);

  const run = debounce(applyFilters, DEBOUNCE_MS);
  inputs.forEach(i => {
    i.addEventListener("input", run);
    i.addEventListener("change", run);
  });

  document.addEventListener("products:rendered", applyFilters);
  applyFilters();
}

document.addEventListener("DOMContentLoaded", bind);
