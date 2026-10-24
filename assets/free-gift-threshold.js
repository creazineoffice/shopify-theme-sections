/**
 * Free gift above a cart value. Configured by snippets/free-gift-threshold.liquid.
 *
 * Theme-agnostic: instead of relying on a theme's own cart events, it watches the
 * storefront's cart requests (fetch and XMLHttpRequest), then reconciles the gift line.
 */
(function () {
  const configElement = document.getElementById('free-gift-config');
  if (!configElement || window.FreeGiftThreshold) return;

  const config = JSON.parse(configElement.textContent);
  const root = window.Shopify?.routes?.root || '/';
  const CART_CHANGE = /\/cart\/(add|change|update|clear)(\.js)?(\?|$)/;
  const IN_CART_KEY = 'free_gift_in_cart';
  const DECLINED_KEY = 'free_gift_declined';
  const nativeFetch = window.fetch.bind(window);

  // The threshold is set in the store currency; carts in another currency are converted.
  const threshold = Math.round(config.threshold * (Number(window.Shopify?.currency?.rate) || 1));

  const flags = {
    get(key) {
      try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; }
    },
    set(key, on) {
      try { on ? sessionStorage.setItem(key, '1') : sessionStorage.removeItem(key); } catch (e) {}
    },
  };

  function cartRequest(path, body) {
    return nativeFetch(root + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then((response) => response.json());
  }

  // Returns true when the script changed the cart.
  async function reconcile() {
    const cart = await cartRequest('cart.js');

    if (!cart.item_count) {
      flags.set(IN_CART_KEY, false);
      flags.set(DECLINED_KEY, false);
      return false;
    }

    const giftLines = cart.items.filter((item) => item.variant_id === config.variantId);
    const spend = cart.items
      .filter((item) => item.variant_id !== config.variantId)
      .reduce((total, item) => total + item.final_line_price, 0);
    let eligible = spend >= threshold;

    // The gift was in the cart last time and is gone while still eligible: the customer removed it.
    if (eligible && !giftLines.length && flags.get(IN_CART_KEY)) flags.set(DECLINED_KEY, true);
    flags.set(IN_CART_KEY, eligible && giftLines.length > 0);
    if (flags.get(DECLINED_KEY)) eligible = false;

    const updates = {};
    giftLines.forEach((line, index) => {
      const wanted = eligible && index === 0 ? 1 : 0;
      if (line.quantity !== wanted) updates[line.key] = wanted;
    });

    if (Object.keys(updates).length) {
      await cartRequest('cart/update.js', { updates });
      return true;
    }
    if (eligible && !giftLines.length) {
      await cartRequest('cart/add.js', {
        items: [{ id: config.variantId, quantity: 1, properties: { _free_gift: 'true' } }],
      });
      flags.set(IN_CART_KEY, true);
      return true;
    }
    return false;
  }

  // Re-render the theme's cart UI from the Section Rendering API.
  async function refreshThemeCart() {
    if (/\/cart\/?$/.test(location.pathname)) {
      location.reload();
      return;
    }

    const targets = config.refreshSections
      .split(',')
      .map((pair) => pair.trim().split(':'))
      .filter(([section, selector]) => section && selector && document.querySelector(selector));
    if (!targets.length) return;

    const sections = await nativeFetch(`${root}?sections=${targets.map(([section]) => section).join(',')}`)
      .then((response) => response.json());

    targets.forEach(([section, selector]) => {
      if (!sections[section]) return;
      const fresh = new DOMParser().parseFromString(sections[section], 'text/html').querySelector(selector);
      const current = document.querySelector(selector);
      if (fresh && current) current.innerHTML = fresh.innerHTML;
    });
  }

  let running = false;
  let queued = false;

  async function run() {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      const changed = await reconcile();
      if (changed) {
        await refreshThemeCart();
        document.dispatchEvent(new CustomEvent('free-gift:cart-updated', { bubbles: true }));
      }
    } catch (error) {
      console.warn('[free-gift]', error);
    }
    running = false;
    if (queued) {
      queued = false;
      run();
    }
  }

  // Watch the theme's cart changes. The script's own requests use nativeFetch, so they are not seen here.
  window.fetch = function (resource, options) {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    const request = nativeFetch(resource, options);
    if (CART_CHANGE.test(url)) request.then(() => setTimeout(run, 0), () => {});
    return request;
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (CART_CHANGE.test(String(url))) this.addEventListener('loadend', () => setTimeout(run, 0));
    return nativeOpen.apply(this, arguments);
  };

  window.FreeGiftThreshold = { run };

  run();
})();
