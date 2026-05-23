(async function () {
  const app = document.getElementById('app');

  // ── Fetch config + products in parallel ───────────────
  let config, products;
  try {
    [config, products] = await Promise.all([
      fetch('/config.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/products.json').then(r => { if (!r.ok) throw new Error(); return r.json(); })
    ]);
  } catch (_) {
    renderError(app, 'Ralat memuatkan halaman. Sila cuba sebentar lagi.');
    return;
  }

  // ── Init tracking ─────────────────────────────────────
  initGA(config.ga_id);
  initPixel(config.pixel_id);

  // ── Resolve product from ?p= param ───────────────────
  const slug = new URLSearchParams(window.location.search).get('p');
  const product = slug && products[slug];

  if (!product) {
    renderError(app, 'Halaman tidak dijumpai.');
    return;
  }

  // ── Render & track ────────────────────────────────────
  renderProduct(app, product);
  safePixel('track', 'ViewContent', { content_name: product.title });
})();

// ── Google Analytics ──────────────────────────────────────
function initGA(id) {
  if (!id || id === 'G-XXXXXXXXXX') return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id);
}

// ── Meta Pixel ────────────────────────────────────────────
function initPixel(id) {
  if (!id || id === 'XXXXXXXXXXXXXXX') return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

// Safe wrapper — no-ops if pixel not loaded (e.g. dev environment)
function safePixel(method, event, data) {
  if (typeof window.fbq === 'function') {
    window.fbq(method, event, data || {});
  }
}

// ── Renderers ─────────────────────────────────────────────
function renderProduct(app, product) {
  const imagesHTML = Array.isArray(product.images) && product.images.length
    ? '<div class="card__images">' +
        product.images
          .map(function (src) {
            return '<img class="card__image" src="' + escHtml(src) + '" alt="" loading="lazy">';
          })
          .join('') +
      '</div>'
    : '';

  app.innerHTML =
    '<div class="card">' +
      '<span class="card__emoji">' + escHtml(product.emoji) + '</span>' +
      '<h1 class="card__title">' + escHtml(product.title) + '</h1>' +
      '<p class="card__description">' + escHtml(product.description) + '</p>' +
      imagesHTML +
      '<button class="card__cta" id="cta-btn">' + escHtml(product.cta) + '</button>' +
      '<p class="card__badge">' + escHtml(product.badge) + '</p>' +
    '</div>';

  document.getElementById('cta-btn').addEventListener('click', function () {
    safePixel('track', 'Lead');
    window.location.href = product.target_url;
  });
}

function renderError(app, message) {
  app.innerHTML =
    '<div class="card card--error">' +
      '<span class="card__emoji">🔍</span>' +
      '<h1 class="card__title">' + escHtml(message) + '</h1>' +
      '<p class="card__description">URL produk ini tidak wujud atau telah dialih keluar.</p>' +
    '</div>';
}

// Prevent XSS from product data
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
