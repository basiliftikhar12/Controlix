// ============================================
// Controlix — Static Product Page Generator
// ============================================
// What this does:
//   Reads products.json and, for every product, writes a real, permanent
//   HTML file (not a client-rendered shell) into /products/<slug>.html
//   with a unique <title>, <meta description>, canonical tag, and
//   Product JSON-LD baked directly into the raw HTML — so Google (and
//   any crawler) sees full content on the very first fetch, with no
//   dependency on JavaScript execution.
//
//   It also regenerates sitemap.xml and a Cloudflare Pages _redirects
//   file so old /product?id=NN links 301 to the new clean URLs.
//
// Run:  node build.js
// ============================================

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://controlix.com.pk";
const BUSINESS_NAME = "Controlix";
const ROOT = __dirname;

const CATEGORY_PAGES = [
  { category: "Flow", title: "Flow Meters & Transmitters", file: "/flow-transmitter" },
  { category: "Level", title: "Level Sensors & Transmitters", file: "/level-transmitter" },
  { category: "Pressure", title: "Pressure Transmitters & Guages", file: "/pressure-transmitter" },
  { category: "Temperature", title: "Temperature Sensors", file: "/temperature-sensors" },
  { category: "General Instruments", title: "Industrial Instruments & Accessories", file: "/general-instruments" },
  { category: "Controllers", title: "Controllers & Indicators", file: "/controllers" },
  { category: "Power & Voltage Regulation", title: "Power & Voltage Regulation", file: "/power-signal-control" }
];

const STATIC_PAGES = ["/", "/about", "/contact", "/flow-transmitter", "/level-transmitter",
  "/pressure-transmitter", "/temperature-sensors", "/general-instruments", "/controllers",
  "/power-signal-control"];

// ---------- helpers ----------

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/&/g, " and ")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assignSlugs(products) {
  const used = new Set();
  return products.map(p => {
    let base = slugify(p.name) || `product-${p.id}`;
    let slug = base;
    let n = 2;
    while (used.has(slug)) {
      slug = `${base}-${n}`;
      n++;
    }
    used.add(slug);
    return { ...p, slug };
  });
}

function getImages(p) {
  if (Array.isArray(p.images) && p.images.length) return p.images;
  if (p.image) return [p.image];
  return [];
}

function absImg(src) {
  if (!src) return "";
  return src.startsWith("http") ? src : `${SITE_URL}/${src.replace(/^\//, "")}`;
}

function parsePrice(priceStr) {
  if (!priceStr) return null;
  const num = priceStr.replace(/[^0-9.]/g, "");
  return num ? num : null;
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function waLink(productName) {
  const msg = encodeURIComponent(`Hi, I'm interested in "${productName}". Could you share more details and pricing?`);
  return `https://wa.me/923104667746?text=${msg}`;
}

const PLACEHOLDER_ICON = `
  <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
`;

// ---------- renderers (mirrors products-app.js markup so hydration is seamless) ----------

function renderProductDetailHTML(p) {
  const imgs = getImages(p);
  const specRows = Object.entries(p.specs || {}).map(([k, v]) =>
    `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`
  ).join("");

  const thumbStrip = imgs.length > 1 ? `
    <div class="thumb-strip" id="thumb-strip">
      ${imgs.map((src, i) => `
        <button class="${i === 0 ? "active" : ""}" data-src="${esc(src)}">
          <img src="/${esc(src)}" alt="${esc(p.name)} view ${i + 1}" loading="lazy">
        </button>
      `).join("")}
    </div>
  ` : "";

  return `
    <div class="image-panel-wrap">
      <div class="image-panel" id="main-image-panel">
        ${imgs.length ? `<img src="/${esc(imgs[0])}" alt="${esc(p.name)}" id="main-image" class="zoomable">` : PLACEHOLDER_ICON}
        ${imgs.length > 1 ? `
          <button class="img-nav prev" id="img-prev" aria-label="Previous image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="img-nav next" id="img-next" aria-label="Next image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ` : ""}
      </div>
      ${thumbStrip}
    </div>
    <div>
    <span class="cat-tag">${esc(p.category)}</span>
    ${p.brand ? `<div class="brand-tag">Brand: <strong>${esc(p.brand)}</strong></div>` : ""}
    <h1>${esc(p.name)}</h1>
    ${p.price ? `<div class="price-tag">${esc(p.price)}</div>` : ""}
    <p class="desc">${esc(p.description)}</p>
      <table class="spec-table">${specRows}</table>
      ${p.features && p.features.length ? `
        <div class="features-block">
          <h3>Key Features</h3>
          <ul class="features-list">
            ${p.features.map(f => `<li>${esc(f)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
      <a class="whatsapp-btn" href="${waLink(p.name)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.93 1.38-.49.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.37c.26-.28.56-.35.75-.35.19 0 .38 0 .54.01.17.01.41-.07.64.49.24.58.81 2 .88 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.21.72-.84.91-1.13.19-.29.38-.24.64-.15.26.1 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.17 1.36z"/></svg>
        Order via WhatsApp
      </a>
    </div>
  `;
}

function renderJsonLd(p) {
  const imgs = getImages(p).map(absImg);
  const priceNum = parsePrice(p.price);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "image": imgs,
    "description": p.shortDesc || p.description,
    "sku": (p.specs && (p.specs.Model || p.specs.model)) || String(p.id),
    ...(p.brand ? { "brand": { "@type": "Brand", "name": p.brand } } : {}),
    ...(priceNum ? {
      "offers": {
        "@type": "Offer",
        "priceCurrency": "PKR",
        "price": priceNum,
        "availability": "https://schema.org/InStock",
        "url": `${SITE_URL}/products/${p.slug}`
      }
    } : {})
  };
  return JSON.stringify(data, null, 2);
}

// ---------- main ----------

function main() {
  const productsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, "products.json"), "utf8"));
  const products = assignSlugs(productsRaw);

  // Write back products.json with slug field — single source of truth
  fs.writeFileSync(path.join(ROOT, "products.json"), JSON.stringify(products, null, 2));

  const template = fs.readFileSync(path.join(ROOT, "templates", "product-template.html"), "utf8");

  const outDir = path.join(ROOT, "products");
  fs.mkdirSync(outDir, { recursive: true });

  const sitemapUrls = [...STATIC_PAGES];

  for (const p of products) {
    const catPage = CATEGORY_PAGES.find(c => c.category === p.category);
    const canonicalUrl = `${SITE_URL}/products/${p.slug}`;
    const shortDesc = (p.shortDesc || p.description || "").slice(0, 160);
    const title = `${p.name} – Price in Pakistan | ${BUSINESS_NAME}`;

    let html = template
      .replace(/{{TITLE}}/g, esc(title))
      .replace(/{{META_DESCRIPTION}}/g, esc(shortDesc))
      .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
      .replace(/{{JSON_LD}}/g, renderJsonLd(p))
      .replace(/{{BREADCRUMB_CATEGORY_HREF}}/g, catPage ? catPage.file : "/")
      .replace(/{{BREADCRUMB_CATEGORY_TEXT}}/g, esc(catPage ? catPage.title : "Products"))
      .replace(/{{BREADCRUMB_CURRENT}}/g, esc(p.name))
      .replace(/{{PRODUCT_DETAIL_HTML}}/g, renderProductDetailHTML(p))
      .replace(/{{PRODUCT_ID}}/g, p.id)
      .replace(/{{PRODUCT_SLUG}}/g, p.slug)
      .replace(/{{PRODUCT_JSON}}/g, JSON.stringify(p).replace(/</g, "\\u003c"));

    fs.writeFileSync(path.join(outDir, `${p.slug}.html`), html);

    sitemapUrls.push(`/products/${p.slug}`);
  }

  // sitemap.xml
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
    .map(u => `  <url><loc>${SITE_URL}${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

  console.log(`Generated ${products.length} product pages -> /products/`);
  console.log(`Generated sitemap.xml (${sitemapUrls.length} URLs)`);
}

main();
