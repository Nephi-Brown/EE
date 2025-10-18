import ProductData from './ExternalServices.mjs';
import ProductDetails from './ProductDetails.mjs';
import { updateCartBadge } from './utils.mjs';

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function showError(msg) {
  const el = document.querySelector('#detail-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

async function init() {
  updateCartBadge();

  const id = getParam('id');
  const mount = document.querySelector('#product-detail');

  if (!mount) return;

  if (!id) {
    showError('No event id provided. Please go back to Events and choose an event.');
    mount.innerHTML = '';
    return;
  }

  try {
    const services = new ProductData();
    const event = await services.getEventById(id);
    const view = new ProductDetails(event, mount);
    view.render();
  } catch (err) {
    console.error(err);
    showError('Sorry, we could not load this event. It may be unavailable.');
    mount.innerHTML = '';
  }
}

init();
