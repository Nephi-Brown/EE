import ProductList from "./ProductList.mjs";
import ProductData from "./ExternalServices.mjs";
import { updateCartBadge } from "./utils.mjs";

function mapCategory(slug) {
  const s = String(slug || "").toLowerCase();
  if (s.includes("music")) return "music";
  if (s.includes("theatre") || s.includes("theater")) return "theatre";
  if (s.includes("cinema") || s.includes("film")) return "cinema";
  if (s.includes("sport")) return "sport";
  if (s === "all") return "all";
  return "";
}

function detectCategory() {
  const params = new URLSearchParams(location.search);
  const q = mapCategory(params.get("category"));

  if (q) return q;

  const path = location.pathname.toLowerCase();
  const pCat = mapCategory(path);
  if (pCat) return pCat;

  const list = getListEl();
  const d = list?.dataset?.category ? mapCategory(list.dataset.category) : "";
  if (d) return d;

  return "all";
}

function getListEl() {
  return (
    document.querySelector(".product-list") ||
    document.querySelector("#product-list") ||
    document.querySelector('[data-el="product-list"]') ||
    document.querySelector("ul") ||
    document.querySelector("ol")
  );
}

function byStartDate(a, b) {
  const sa = a?.dates?.start, sb = b?.dates?.start;
  const ia = sa?.dateTime || sa?.localDate || "";
  const ib = sb?.dateTime || sb?.localDate || "";
  const da = ia ? new Date(ia).getTime() : Infinity;
  const db = ib ? new Date(ib).getTime() : Infinity;
  return da - db;
}

async function fetchAll() {
  const cats = ["music", "theatre", "cinema", "sport"];
  const results = await Promise.all(
    cats.map(c => new ProductData(c).getData(c).catch(() => []))
  );
  const merged = [];
  const seen = new Set();
  for (const arr of results) {
    for (const e of arr) {
      const id = e?.Id || e?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(e);
    }
  }
  merged.sort(byStartDate);
  return merged;
}

async function init() {
  updateCartBadge();

  const listEl = getListEl();
  if (!listEl) return;

  const category = detectCategory();
  listEl.dataset.category = category;

  let dataSource;
  if (category === "all") {
    const all = await fetchAll();
    dataSource = { getData: async () => all };
  } else {
    dataSource = new ProductData(category);
  }

  const list = new ProductList(category, dataSource, listEl, "");
  await list.init();
}

document.addEventListener("DOMContentLoaded", init);
