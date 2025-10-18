import { renderListWithTemplate, updateCartBadge } from './utils.mjs';
import ProductData from './ExternalServices.mjs';

const LS_KEY = 'priceOverrides';

function getOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; }
}
function saveOverrides(map) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}
function getAssignedAvg(id) {
  const m = getOverrides();
  return m && id in m ? Number(m[id]) : null;
}
function setAssignedAvg(id, avg) {
  const m = getOverrides();
  m[id] = Number(avg);
  saveOverrides(m);
}

function eventIso(item) {
  const s = item?.dates?.start || {};
  return s.dateTime || s.localDate || '';
}
function eventDate(item) {
  const iso = eventIso(item);
  if (!iso) return '';
  const d = new Date(iso);
  const hasTime = /\dT\d/.test(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const time = hasTime ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  return hasTime ? `${date} ${time}` : date;
}

function gbp(n) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n); }

function numbersFromText(item) {
  const fields = [item?.info, item?.pleaseNote, item?.Name, item?.name, item?._embedded?.venues?.[0]?.boxOfficeInfo?.phoneNumberDetail, item?._embedded?.venues?.[0]?.boxOfficeInfo?.openHoursDetail, item?._embedded?.venues?.[0]?.generalInfo?.generalRule, item?._embedded?.venues?.[0]?.generalInfo?.childRule].map(s => (s || '').toString());
  const rx = /(£|gbp)\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const out = [];
  for (const s of fields) { if (!s) continue; let m; while ((m = rx.exec(s))) { const n = parseFloat(String(m[2]).replace(',', '.')); if (Number.isFinite(n)) out.push(n); } }
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
    const a = Number(r?.min), b = Number(r?.max);
    if (Number.isFinite(a) && a > 0) vals.push(a);
    if (Number.isFinite(b) && b > 0) vals.push(b);
  }
  vals.push(...numbersFromText(item));
  const nums = vals.filter(n => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  return { min, max };
}

function averageForItem(item) {
  const id = item?.Id || item?.id;
  if (!id) return null;
  const mm = minMax(item);
  if (mm) {
    if (Number.isFinite(mm.min) && Number.isFinite(mm.max)) return (mm.min + mm.max) / 2;
    if (Number.isFinite(mm.min)) return mm.min;
    if (Number.isFinite(mm.max)) return mm.max;
  }
  const assigned = getAssignedAvg(id);
  if (Number.isFinite(assigned) && assigned > 0) return assigned;
  const rand = Math.round((Math.random() * (95 - 18) + 18) * 100) / 100;
  setAssignedAvg(id, rand);
  return rand;
}

export default class ProductList {
  constructor(category, dataSource, listElement, query = '') {
    this.category = category || 'music';
    this.dataSource = dataSource || new ProductData(this.category);
    this.listElement = listElement;
    this.query = (query || '').trim().toLowerCase();
    this.products = [];
  }

  async init() {
    try {
      const events = await this.dataSource.getData(this.category);
      this.products = this.query ? events.filter(e => (e.Name || e.name || '').toLowerCase().includes(this.query)) : events;
      this.renderList(this.products);
      updateCartBadge();
      if (this.listElement) this.listElement.dataset.category = this.category;
      document.dispatchEvent(new CustomEvent('products:rendered', { detail: { count: this.products.length } }));
    } catch (e) {
      if (this.listElement) this.listElement.innerHTML = `<li class="product-card error">Unable to load events.</li>`;
      console.error(e);
    }
  }

  img(it) { return it?.Images?.PrimaryMedium || it?.images?.[0]?.url || '/images/placeholder.png'; }
  venue(it) { return it?.Brand?.Name || it?._embedded?.venues?.[0]?.name || 'Venue TBA'; }

  priceHTML(it) {
    const avg = averageForItem(it);
    if (Number.isFinite(avg) && avg > 0) return `<p class="product-card__price">Ticket Price ${gbp(avg)}</p>`;
    return `<p class="product-card__price price-tba">Price TBA</p>`;
  }

  cardTemplate(it) {
    const id = it?.Id || it?.id; if (!id) return '';
    const name = it?.Name || it?.name || 'Event';
    const iso = eventIso(it);
    const avg = averageForItem(it);
    const meta = eventDate(it);
    return `
      <li class="product-card" data-id="${id}" data-date="${iso || ''}" data-avg="${Number.isFinite(avg) ? avg : ''}">
        <a class="card__link" href="../product_pages/index.html?id=${encodeURIComponent(id)}">
          <div class="card__media"><img src="${this.img(it)}" alt="${name}" loading="lazy"/></div>
          <div class="card__body">
            <h3 class="card__brand">${this.venue(it)}</h3>
            <h2 class="card__name">${name}</h2>
            ${meta ? `<p class="card__meta">${meta}</p>` : ''}
            ${this.priceHTML(it)}
          </div>
        </a>
      </li>
    `;
  }

  renderList(list) {
    if (!this.listElement) return;
    this.listElement.innerHTML = '';
    renderListWithTemplate(it => this.cardTemplate(it), this.listElement, Array.isArray(list) ? list : []);
  }
}
