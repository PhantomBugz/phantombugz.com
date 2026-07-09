// PhantomBugz shop — fetches the live catalog, manages a client cart, and hands off to
// hosted Stripe Checkout. Cross-platform: no PDF-in-iframe, no engine-specific APIs,
// hosted-Checkout redirect only. Cart is client-side; PRICES are always the server's.
const API = 'https://pbz-store.azurewebsites.net';

const state = {
  products: [],
  cart: new Map(), // variantId -> { qty, label, title, priceCents, currency }
};

const fmt = (cents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

async function loadCatalog() {
  const grid = document.getElementById('shop-grid');
  try {
    const res = await fetch(`${API}/api/products`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`catalog ${res.status}`);
    const { products } = await res.json();
    state.products = products;
    renderCatalog();
  } catch (err) {
    grid.innerHTML = `<p class="shop-error" role="alert">The store is briefly unavailable. Please try again shortly.</p>`;
    console.error('catalog load failed:', err.message);
  }
}

function renderCatalog() {
  const grid = document.getElementById('shop-grid');
  if (!state.products.length) {
    grid.innerHTML = `<p class="shop-empty">No items available yet. Check back soon.</p>`;
    return;
  }
  grid.innerHTML = '';
  for (const p of state.products) {
    const card = document.createElement('article');
    card.className = 'shop-card';

    // Slug is our own DB data, but it lands in src/srcset attributes — restrict to a safe
    // charset so it can never break out of the attribute (defense in depth).
    const imgSlug = String(p.slug).replace(/[^a-z0-9-]/gi, '');
    const priceFrom = p.variants.length
      ? Math.min(...p.variants.map((v) => v.price_cents))
      : 0;

    const options = p.variants
      .map((v) => `<option value="${v.id}" data-price="${v.price_cents}" data-currency="${v.currency}" data-label="${escapeHtml(v.label)}">${escapeHtml(v.label)} — ${fmt(v.price_cents, v.currency)}</option>`)
      .join('');

    card.innerHTML = `
      <div class="shop-shot">
        <picture>
          <source srcset="./assets/products/ghost/${imgSlug}.webp" type="image/webp">
          <img src="./assets/products/ghost/${imgSlug}.jpg" alt="${escapeHtml(p.title)}" loading="lazy" data-fallback>
        </picture>
      </div>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="shop-desc">${escapeHtml(p.description || '')}</p>
      <p class="shop-price">${p.variants.length ? `From ${fmt(priceFrom, p.variants[0].currency)}` : ''}</p>
      ${p.variants.length > 1
        ? `<label class="shop-variant"><span class="sr-only">Choose option for ${escapeHtml(p.title)}</span>
             <select data-product="${p.id}">${options}</select></label>`
        : `<input type="hidden" class="shop-single" data-product="${p.id}"
             data-variant="${p.variants[0]?.id || ''}" data-price="${p.variants[0]?.price_cents || 0}"
             data-currency="${p.variants[0]?.currency || 'USD'}" data-label="${escapeHtml(p.variants[0]?.label || '')}">`}
      <button class="shop-add" type="button" data-product="${p.id}" data-title="${escapeHtml(p.title)}">Add to cart</button>
    `;
    grid.appendChild(card);
  }
  // Safe programmatic image fallback (no inline onerror): swap to the emblem if a
  // product shot 404s. Attached once per render.
  grid.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      // Inside <picture>, a <source srcset> can override img.src — remove it so the
      // emblem fallback actually renders.
      const pic = img.closest('picture');
      if (pic) pic.querySelectorAll('source').forEach((s) => s.remove());
      img.src = './assets/exports/phantombugz-emblem-transparent.png';
      img.classList.add('shot-fallback');
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

function selectedVariant(card, productId) {
  const sel = card.querySelector(`select[data-product="${productId}"]`);
  if (sel) {
    const opt = sel.selectedOptions[0];
    return {
      variantId: opt.value,
      priceCents: Number(opt.dataset.price),
      currency: opt.dataset.currency,
      label: opt.dataset.label,
    };
  }
  const hidden = card.querySelector(`.shop-single[data-product="${productId}"]`);
  return {
    variantId: hidden.dataset.variant,
    priceCents: Number(hidden.dataset.price),
    currency: hidden.dataset.currency,
    label: hidden.dataset.label,
  };
}

function addToCart(productId, title, card) {
  const v = selectedVariant(card, productId);
  if (!v.variantId) return;
  const existing = state.cart.get(v.variantId);
  const qty = (existing?.qty || 0) + 1;
  state.cart.set(v.variantId, { qty, label: v.label, title, priceCents: v.priceCents, currency: v.currency });
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cart-lines');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('cart-checkout');
  list.innerHTML = '';
  let total = 0;
  let currency = 'USD';
  for (const [variantId, item] of state.cart) {
    total += item.priceCents * item.qty;
    currency = item.currency;
    const li = document.createElement('li');
    li.className = 'cart-line';
    li.innerHTML = `
      <span class="cart-line-name">${escapeHtml(item.title)} <em>${escapeHtml(item.label)}</em></span>
      <span class="cart-qty">
        <button type="button" class="qty-dec" data-variant="${variantId}" aria-label="Decrease quantity">−</button>
        <span>${item.qty}</span>
        <button type="button" class="qty-inc" data-variant="${variantId}" aria-label="Increase quantity">+</button>
      </span>
      <span class="cart-line-price">${fmt(item.priceCents * item.qty, item.currency)}</span>`;
    list.appendChild(li);
  }
  const count = [...state.cart.values()].reduce((n, i) => n + i.qty, 0);
  document.getElementById('cart-count').textContent = count;
  totalEl.textContent = fmt(total, currency);
  checkoutBtn.disabled = count === 0;
  document.getElementById('cart-empty').hidden = count > 0;
}

function changeQty(variantId, delta) {
  const item = state.cart.get(variantId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart.delete(variantId);
  renderCart();
}

async function checkout() {
  const email = document.getElementById('cart-email').value.trim();
  const err = document.getElementById('checkout-error');
  err.textContent = '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    err.textContent = 'Please enter a valid email for your receipt.';
    return;
  }
  const cart = [...state.cart.entries()].map(([variantId, i]) => ({ variantId, quantity: i.qty }));
  if (!cart.length) return;

  const btn = document.getElementById('cart-checkout');
  btn.disabled = true;
  btn.textContent = 'Redirecting…';
  try {
    const res = await fetch(`${API}/api/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, cart }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'checkout failed');
    window.location.href = data.url; // hosted Stripe Checkout — cross-platform safe
  } catch (e) {
    err.textContent = 'Could not start checkout. Please try again.';
    btn.disabled = false;
    btn.textContent = 'Checkout';
    console.error('checkout failed:', e.message);
  }
}

// --- wiring (event delegation so it survives re-render) ---
document.addEventListener('click', (e) => {
  const add = e.target.closest('.shop-add');
  if (add) return addToCart(add.dataset.product, add.dataset.title, add.closest('.shop-card'));
  const inc = e.target.closest('.qty-inc');
  if (inc) return changeQty(inc.dataset.variant, +1);
  const dec = e.target.closest('.qty-dec');
  if (dec) return changeQty(dec.dataset.variant, -1);
  if (e.target.closest('#cart-checkout')) return checkout();
});

loadCatalog();
renderCart();
