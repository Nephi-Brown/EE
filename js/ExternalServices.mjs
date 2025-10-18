import { setLocalStorage } from './utils.mjs';

async function convertToJson(res) {
  const jsonResponse = await res.json();
  if (!res.ok) throw { name: 'servicesError', message: jsonResponse };
  return jsonResponse;
}

// ---------- price helpers ----------
function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[ ,]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}
function findGBPInText(...texts) {
  const rx = /(£|gbp)\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const nums = [];
  for (const t of texts) {
    if (!t || typeof t !== 'string') continue;
    let m;
    while ((m = rx.exec(t))) {
      const n = toNum(m[2]);
      if (Number.isFinite(n) && n > 0) nums.push(n);
    }
  }
  return nums;
}
function extractPrice(e) {
  const candidates = [];
  if (Array.isArray(e.priceRanges)) {
    for (const pr of e.priceRanges) {
      const min = toNum(pr?.min);
      const max = toNum(pr?.max);
      if (Number.isFinite(min) && min > 0) candidates.push(min);
      if (Number.isFinite(max) && max > 0) candidates.push(max);
    }
  }
  candidates.push(
    ...findGBPInText(
      e.info,
      e.pleaseNote,
      e.name,
      e?._embedded?.venues?.[0]?.boxOfficeInfo?.openHoursDetail,
      e?._embedded?.venues?.[0]?.boxOfficeInfo?.phoneNumberDetail,
      e?._embedded?.venues?.[0]?.generalInfo?.generalRule,
      e?._embedded?.venues?.[0]?.generalInfo?.childRule
    )
  );
  const positives = candidates.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!positives.length) return { min: null, max: null, text: null };
  const min = positives[0];
  const rangeMaxes = (Array.isArray(e.priceRanges)
    ? e.priceRanges.map(pr => toNum(pr?.max)).filter(n => Number.isFinite(n) && n >= min)
    : []);
  const max = rangeMaxes.length ? Math.max(...rangeMaxes) : null;

  let text = null;
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) text = `£${min.toFixed(2)} - £${max.toFixed(2)}`;
  else if (Number.isFinite(min)) text = `From £${min.toFixed(2)}`;

  return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null, text };
}
function normalizeEvent(e) {
  const { min, max, text } = extractPrice(e);
  return {
    ...e,
    Id: e.id,
    Name: e.name,
    NameWithoutBrand: e.name,
    Images: {
      PrimarySmall: e.images?.[0]?.url || '/images/placeholder.png',
      PrimaryMedium: e.images?.[0]?.url || '/images/placeholder.png'
    },
    FinalPrice: min ?? 0,
    PriceMin: min,
    PriceMax: max,
    PriceText: text,
    Brand: { Name: e._embedded?.venues?.[0]?.name || 'Venue TBA' },
    DescriptionHtmlSimple: e.info || e.pleaseNote || '',
  };
}

export default class ProductData {
  constructor(category) {
    this.category = category;
  }

  async getData(category = this.category) {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) throw new Error('API key not configured. Set VITE_TICKETMASTER_API_KEY in your .env');

    const normalized = (category || '').toLowerCase();
    const effectiveCategory = normalized === 'sport' ? 'sports' : normalized;

    const base = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const map = {
      music: 'KZFzniwnSyZfZ7v7nJ',
      theatre: 'KZFzniwnSyZfZ7v7na',
      sports: 'KZFzniwnSyZfZ7v7nE',
      cinema: ''
    };

    let url = `${base}?apikey=${apiKey}&city=Edinburgh&size=50&countryCode=GB&locale=en-gb&sort=date,asc`;
    if (effectiveCategory === 'cinema') url += '&keyword=film';
    else if (map[effectiveCategory]) url += `&segmentId=${map[effectiveCategory]}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid API key. Check VITE_TICKETMASTER_API_KEY.');
      if (res.status === 429) throw new Error('Too many requests. Please try again in a moment.');
      if (res.status >= 500) throw new Error('Server error. Ticketmaster is unavailable.');
      throw new Error(`Failed to fetch events (HTTP ${res.status})`);
    }

    const data = await res.json();
    const events = data?._embedded?.events || [];
    return events.map(normalizeEvent);
  }

  // NEW: get a single event by ID (used on the detail page)
  async getEventById(id) {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) throw new Error('API key not configured. Set VITE_TICKETMASTER_API_KEY in your .env');

    const url = `https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(id)}.json?apikey=${apiKey}&locale=en-gb`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error('Event not found');
      if (res.status === 401) throw new Error('Invalid API key. Check VITE_TICKETMASTER_API_KEY.');
      throw new Error(`Failed to fetch event (HTTP ${res.status})`);
    }
    const event = await res.json();
    return normalizeEvent(event);
  }

  async findProductById(id) {
    // keep legacy method—try API detail first
    try {
      return await this.getEventById(id);
    } catch {
      const products = await this.getData();
      return products.find((item) => item.Id === id || item.id === id);
    }
  }

  async checkout(payload) {
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    setLocalStorage('order', payload);
    return await fetch('src/checkout/', options).then(convertToJson);
  }
}
