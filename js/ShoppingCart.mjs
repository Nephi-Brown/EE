const LS_KEY = 'priceOverrides';
const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

function getOverrides(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; } }
function getAssignedAvg(id){ const m = getOverrides(); return m && id in m ? Number(m[id]) : null; }

function eventDate(it){
  const s = it?.dates?.start || {}; const iso = s.dateTime || s.localDate || '';
  if (!iso) return '';
  const d = new Date(iso); const hasTime = Boolean(s.dateTime);
  const date = d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const time = hasTime ? d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
  return hasTime ? `${date} ${time}` : date;
}

function numbersFromText(item){
  const fields=[item?.info,item?.pleaseNote,item?.Name,item?.name,item?._embedded?.venues?.[0]?.boxOfficeInfo?.phoneNumberDetail,item?._embedded?.venues?.[0]?.boxOfficeInfo?.openHoursDetail,item?._embedded?.venues?.[0]?.generalInfo?.generalRule,item?._embedded?.venues?.[0]?.generalInfo?.childRule].map(s => (s||'').toString());
  const rx=/(£|gbp)\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const out=[]; for(const s of fields){ if(!s) continue; let m; while((m=rx.exec(s))){ const n=parseFloat(String(m[2]).replace(',','.')); if(Number.isFinite(n)) out.push(n); } }
  return out;
}
function minMax(item){
  const vals=[];
  const min1 = Number(item?.PriceMin ?? item?.FinalPrice ?? item?.Price);
  const max1 = Number(item?.PriceMax);
  if(Number.isFinite(min1) && min1 > 0) vals.push(min1);
  if(Number.isFinite(max1) && max1 > 0) vals.push(max1);
  const ranges = Array.isArray(item?.priceRanges) ? item.priceRanges : [];
  for(const r of ranges){ const a=Number(r?.min), b=Number(r?.max); if(Number.isFinite(a)&&a>0) vals.push(a); if(Number.isFinite(b)&&b>0) vals.push(b); }
  vals.push(...numbersFromText(item));
  const nums = vals.filter(n => Number.isFinite(n) && n > 0);
  if(!nums.length) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  return { min, max };
}
function avgUnit(item){
  const id = item?.Id || item?.id; if(!id) return 0;
  const mm = minMax(item);
  if (mm){
    if(Number.isFinite(mm.min) && Number.isFinite(mm.max)) return (mm.min + mm.max) / 2;
    if(Number.isFinite(mm.min)) return mm.min;
    if(Number.isFinite(mm.max)) return mm.max;
  }
  const assigned = getAssignedAvg(id);
  return Number.isFinite(assigned) && assigned > 0 ? assigned : 0;
}

function primaryImg(it){ return it?.Images?.PrimarySmall || it?.Images?.PrimaryMedium || it?.images?.[0]?.url || '/images/placeholder.png'; }
function venue(it){ return it?.Brand?.Name || it?._embedded?.venues?.[0]?.name || 'Venue TBA'; }

function itemTemplate(it){
  const id = it?.Id || it?.id; const qty = Number(it?.quantity || 1);
  const unit = avgUnit(it); const line = unit * qty;
  const priceText = unit > 0
    ? `Ticket Price ${GBP.format(unit)} <span aria-hidden="true">×</span> ${qty} <span class="muted">=</span> <strong>${GBP.format(line)}</strong>`
    : `Price TBA <span aria-hidden="true">×</span> ${qty} <span class="muted">—</span>`;
  const meta = eventDate(it);
  const href = `../product_pages/index.html?id=${encodeURIComponent(id)}`;
  return `
    <li class="product-card" data-id="${id}">
      <a class="card__link" href="${href}" aria-label="View details for ${it?.Name||it?.name||'Event'}">
        <div class="card__media"><img src="${primaryImg(it)}" alt="${it?.Name||it?.name||'Event'}" loading="lazy"/></div>
        <div class="card__body">
          <h3 class="card__brand">${venue(it)}</h3>
          <h2 class="card__name">${it?.Name||it?.name||'Event'}</h2>
          ${meta?`<p class="card__meta">${meta}</p>`:''}
          <p class="product-card__price">${priceText}</p>
        </div>
      </a>
      <div class="card__actions"><button class="btn btn-remove" type="button" aria-label="Remove from cart">Remove</button></div>
    </li>
  `;
}

/* ---------- footer / actions helpers ---------- */

function ensureActionsHost(listEl){
  let host = document.querySelector('#cart-footer');
  if (host) return host;
  // fallback: make a simple row after the list
  const fallback = document.getElementById('cart-actions-fallback') || document.createElement('div');
  fallback.id = 'cart-actions-fallback';
  fallback.style.display = 'flex';
  fallback.style.gap = '10px';
  fallback.style.justifyContent = 'flex-end';
  fallback.style.marginTop = '12px';
  if (!fallback.parentElement && listEl?.parentElement) listEl.parentElement.appendChild(fallback);
  return fallback;
}

function ensureButtons(listEl){
  const host = ensureActionsHost(listEl);
  let actions = host.querySelector('.footer-actions');
  if (!actions){
    actions = document.createElement('div');
    actions.className = 'footer-actions';
    host.appendChild(actions);
  }
  let clearBtn = actions.querySelector('#clear-cart-btn');
  if (!clearBtn){
    clearBtn = document.createElement('button');
    clearBtn.id = 'clear-cart-btn';
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear Cart';
    actions.appendChild(clearBtn);
  }
  let checkoutBtn = actions.querySelector('#checkout-btn');
  if (!checkoutBtn){
    checkoutBtn = document.createElement('button');
    checkoutBtn.id = 'checkout-btn';
    checkoutBtn.type = 'button';
    checkoutBtn.textContent = 'Checkout';
    actions.appendChild(checkoutBtn);
  }
  return { host, clearBtn, checkoutBtn };
}

function setButtonsEnabled(enabled){
  const a = document.getElementById('clear-cart-btn');
  const b = document.getElementById('checkout-btn');
  [a,b].forEach(btn => {
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.6';
    btn.style.cursor  = enabled ? 'pointer' : 'not-allowed';
  });
}

/* ---------- component ---------- */

export default class ShoppingCart{
  constructor(dataSource,listElement,onChange){
    this.cart = Array.isArray(dataSource) ? dataSource : [];
    this.listElement = listElement;
    this.onChange = typeof onChange === 'function' ? onChange : () => {};
  }

  init(){ this.render(); }

  set(cart){ this.cart = Array.isArray(cart) ? cart : []; this.render(); this.onChange(this.cart); }
  remove(id){ this.set(this.cart.filter(p => (p.Id || p.id) !== id)); }
  clear(){ this.set([]); }

  totals(){
    const subtotal = this.cart.reduce((s,i)=> s + avgUnit(i) * (Number(i.quantity)||1), 0);
    return { subtotal, final: subtotal };
  }

  render(){
    if (!this.listElement) return;

    // List content
    if (!Array.isArray(this.cart) || this.cart.length === 0){
      this.listElement.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
      const f = document.querySelector('#cart-footer'); if (f) f.classList.add('hide');
      // ensure buttons exist but disabled
      ensureButtons(this.listElement);
      setButtonsEnabled(false);
      return;
    }

    this.listElement.innerHTML = this.cart.map(itemTemplate).join('');

    // Totals
    const { subtotal, final } = this.totals();
    const f = document.querySelector('#cart-footer');
    if (f){
      f.classList.remove('hide');
      const s = document.querySelector('#cart-total');
      const e = document.querySelector('#cart-final');
      if (s) s.textContent = GBP.format(subtotal);
      if (e) e.textContent = GBP.format(final);
    }

    // Actions (create if missing, wire each render)
    const { clearBtn, checkoutBtn } = ensureButtons(this.listElement);

    if (clearBtn && !clearBtn._wired){
      clearBtn.addEventListener('click', () => this.clear());
      clearBtn._wired = true;
    }
    if (checkoutBtn && !checkoutBtn._wired){
      checkoutBtn.addEventListener('click', () => {
        if (this.cart.length === 0) return;
        window.location.href = '../checkout/index.html';
      });
      checkoutBtn._wired = true;
    }

    setButtonsEnabled(true);
  }
}
