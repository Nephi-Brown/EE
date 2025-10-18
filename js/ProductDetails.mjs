import { getLocalStorage, setLocalStorage, updateCartBadge } from './utils.mjs';

const LS_KEY = 'priceOverrides';

function getOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; }
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
  ].map(s => (s || '').toString());
  const rx = /(£|gbp)\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const out = [];
  for (const s of fields) {
    if (!s) continue;
    let m;
    while ((m = rx.exec(s))) {
      const n = parseFloat(String(m[2]).replace(',', '.'));
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
  return null;
}
function gbp(n) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

export default class ProductDetails {
  constructor(event, mountEl) {
    this.event = event;
    this.mountEl = mountEl;
    this.btn = null;
    this.qtyWrap = null;
    this.qtyInput = null;
  }

  _cart() { return getLocalStorage('so-cart', []) || []; }
  _save(cart) { setLocalStorage('so-cart', cart); updateCartBadge(); }
  _id() { return this.event.Id || this.event.id; }

  _getCartItemIndex() {
    const id = this._id();
    return this._cart().findIndex(p => (p.Id || p.id) === id);
  }
  _getCartItem() {
    const idx = this._getCartItemIndex();
    const cart = this._cart();
    return idx > -1 ? cart[idx] : null;
  }
  _inCart() { return this._getCartItemIndex() > -1; }

  _makeCartItem() {
    const seg = this.event?.classifications?.[0]?.segment?.name || '';
    return {
      Id: this._id(),
      Name: this.event.Name || this.event.name || 'Event',
      Images: {
        PrimarySmall: this.event.Images?.PrimarySmall || this.event.images?.[0]?.url || '/images/placeholder.png',
        PrimaryMedium: this.event.Images?.PrimaryMedium || this.event.images?.[0]?.url || '/images/placeholder.png'
      },
      Brand: { Name: this.event.Brand?.Name || this.event?._embedded?.venues?.[0]?.name || 'Venue TBA' },
      DescriptionHtmlSimple: this.event.DescriptionHtmlSimple || '',
      FinalPrice: Number(this.event.PriceMin ?? this.event.FinalPrice ?? 0) || 0,
      quantity: 1,
      classifications: this.event.classifications || null,
      dates: this.event.dates || null,
      _category: (seg || '').toLowerCase(),
      _type: 'event'
    };
  }

  _add() {
    const cart = this._cart();
    const idx = this._getCartItemIndex();
    if (idx > -1) {
      cart[idx].quantity = (cart[idx].quantity || 1) + 1;
    } else {
      cart.push(this._makeCartItem());
    }
    this._save(cart);
  }
  _remove() {
    const id = this._id();
    this._save(this._cart().filter(p => (p.Id || p.id) !== id));
  }
  _setQty(q) {
    const qty = Math.max(1, Math.min(20, Number(q) || 1));
    const cart = this._cart();
    const idx = this._getCartItemIndex();
    if (idx > -1) {
      cart[idx].quantity = qty;
      this._save(cart);
    }
    if (this.qtyInput) this.qtyInput.value = String(qty);
  }
  _inc = () => this._setQty((this._getCartItem()?.quantity || 1) + 1);
  _dec = () => this._setQty((this._getCartItem()?.quantity || 1) - 1);

  _setBtnState(inCart) {
    if (!this.btn) return;
    if (inCart) {
      this.btn.classList.add('pd-remove');
      this.btn.textContent = 'Remove from Cart';
      this.btn.setAttribute('aria-pressed', 'true');
      if (this.qtyWrap) this.qtyWrap.style.display = '';
    } else {
      this.btn.classList.remove('pd-remove');
      this.btn.textContent = 'Add to Cart';
      this.btn.setAttribute('aria-pressed', 'false');
      if (this.qtyWrap) this.qtyWrap.style.display = 'none';
    }
  }
  _toggle = () => {
    const inCart = this._inCart();
    if (inCart) this._remove();
    else this._add();
    this._setBtnState(!inCart);
    if (!inCart) this._setQty(this._getCartItem()?.quantity || 1);
  };

  venueHTML() {
    const v = this.event?._embedded?.venues?.[0];
    const name = this.event?.Brand?.Name || v?.name || 'Venue TBA';
    const addr = [v?.address?.line1, v?.city?.name, v?.postalCode].filter(Boolean).join(', ');
    return `<div class="pd-venue"><h3>${name}</h3>${addr ? `<p class="pd-addr">${addr}</p>` : ''}</div>`;
  }
  whenHTML() {
    const s = this.event?.dates?.start || {};
    const iso = s.dateTime || s.localDate || '';
    if (!iso) return '';
    const d = new Date(iso);
    const hasTime = Boolean(s.dateTime);
    const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const time = hasTime ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    return hasTime ? `<div class="pd-when"><span>${date}</span><span>${time}</span></div>` : `<div class="pd-when"><span>${date}</span></div>`;
  }

  priceHTML() {
    const avg = averageForItem(this.event);
    if (Number.isFinite(avg) && avg > 0) return `<div class="pd-price">Ticket Price ${gbp(avg)}</div>`;
    const t = this.event?.PriceText;
    if (t) return `<div class="pd-price">${t}</div>`;
    const min = Number(this.event?.PriceMin ?? this.event?.FinalPrice);
    const max = Number(this.event?.PriceMax);
    const hasMin = Number.isFinite(min) && min > 0;
    const hasMax = Number.isFinite(max) && max > 0;
    if (hasMin && hasMax && max > min) return `<div class="pd-price">${gbp(min)} - ${gbp(max)}</div>`;
    if (hasMin) return `<div class="pd-price">From ${gbp(min)}</div>`;
    return `<div class="pd-price pd-price-tba">Price TBA</div>`;
  }

  qtyHTML() {
    return `
      <div id="pd-qty" class="pd-qty" style="display:none; gap:8px; align-items:center; margin-top:8px;">
        <button type="button" id="pd-qty-minus" aria-label="Decrease quantity" class="pd-add" style="padding:.5rem 0.8rem;">−</button>
        <input id="pd-qty-input" type="number" min="1" max="20" step="1" value="1" aria-label="Ticket quantity" style="width:64px; text-align:center; padding:.45rem .25rem; border-radius:10px; border:1px solid #ddd;" />
        <button type="button" id="pd-qty-plus" aria-label="Increase quantity" class="pd-add" style="padding:.5rem 0.8rem;">+</button>
      </div>
    `;
  }

  render() {
    const e = this.event;
    const img = e?.Images?.PrimaryMedium || e?.images?.[0]?.url || '/images/placeholder.png';
    const name = e?.Name || e?.name || 'Event';
    const html = `
      <article class="product-detail">
        <div class="pd-media"><img src="${img}" alt="${name}" loading="eager"></div>
        <div class="pd-info">
          <h1 class="pd-title">${name}</h1>
          ${this.venueHTML()}
          ${this.whenHTML()}
          ${this.priceHTML()}
          <div class="pd-cta">
            <button id="pd-toggle-btn" class="pd-add" type="button" aria-label="Add or remove event from cart" aria-pressed="false">Add to Cart</button>
            ${this.qtyHTML()}
          </div>
          ${e.DescriptionHtmlSimple ? `<div class="pd-desc">${e.DescriptionHtmlSimple}</div>` : ''}
        </div>
      </article>
    `;
    this.mountEl.innerHTML = html;

    this.btn = document.querySelector('#pd-toggle-btn');
    this.qtyWrap = document.querySelector('#pd-qty');
    this.qtyInput = document.querySelector('#pd-qty-input');

    this.btn?.addEventListener('click', this._toggle);
    document.querySelector('#pd-qty-minus')?.addEventListener('click', this._dec);
    document.querySelector('#pd-qty-plus')?.addEventListener('click', this._inc);
    this.qtyInput?.addEventListener('change', () => this._setQty(this.qtyInput.value));

    const inCart = this._inCart();
    this._setBtnState(inCart);
    if (inCart) this._setQty(this._getCartItem()?.quantity || 1);
    updateCartBadge();
  }
}
