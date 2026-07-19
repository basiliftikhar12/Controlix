// ============================================
// SITE CONFIG — edit for your business
// ============================================
const WHATSAPP_NUMBER = "923104667746"; // <-- replace with your real WhatsApp Business number
const BUSINESS_NAME = "IndusFlow Instruments";

function waLink(productName) {
  const msg = encodeURIComponent(`Hi, I'm interested in "${productName}". Could you share more details and pricing?`);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}

// Category → display title + page filename, used for the sidebar and page banners
const CATEGORY_PAGES = [
  { category: "Flow", title: "Flow Meters & Transmitters", file: "flow-transmitter.html" },
  { category: "Level", title: "Level Sensors & Transmitters", file: "level-transmitter.html" },
  { category: "Pressure", title: "Pressure Transmitters & Guages", file: "pressure-transmitter.html" },
  { category: "Temperature", title: "Temperature Sensors", file: "temperature-sensors.html" },
  { category: "General Instruments", title: "Industrial Instruments & Accessories", file: "general-instruments.html" },
  { category: "Controllers", title: "Controllers & Indicators", file: "controllers.html" }
];


// Simple category placeholder icon (shown when a product has no image yet)
const PLACEHOLDER_ICON = `
  <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
`;

// Returns an array of image URLs for a product, supporting both the new
// "images": [...] field and the older single "image": "..." field.
function getImages(p) {
  if (Array.isArray(p.images) && p.images.length) return p.images;
  if (p.image) return [p.image];
  return [];
}

// ============================================
// Load products.json
// ============================================
async function loadProducts() {
  const res = await fetch("products.json");
  return res.json();
}

// ============================================
// Category sidebar (shared across all category pages)
// ============================================
function renderSidebar(activeCategory) {
  const sidebar = document.getElementById("category-sidebar");
  if (!sidebar) return;
  sidebar.innerHTML = `
    <h3>Categories</h3>
    ${CATEGORY_PAGES.map(c => `
      <a href="${c.file}" class="${c.category === activeCategory ? "active" : ""}">${c.title}</a>
    `).join("")}
  `;
}

// ============================================
// Grid / list view toggle
// ============================================
function initViewToggle(grid) {
  const toggle = document.getElementById("view-toggle");
  if (!toggle) return;
  const gridBtn = toggle.querySelector('[data-view="grid"]');
  const listBtn = toggle.querySelector('[data-view="list"]');

  function setView(view) {
    grid.classList.toggle("list-view", view === "list");
    gridBtn.classList.toggle("active", view === "grid");
    listBtn.classList.toggle("active", view === "list");
  }

  gridBtn.addEventListener("click", () => setView("grid"));
  listBtn.addEventListener("click", () => setView("list"));
}

// ============================================
// Render product grid
// ============================================
function renderGrid(products, container) {
  if (!products.length) {
    container.innerHTML = `<div class="empty-state">No products in this category yet.</div>`;
    return;
  }
  container.innerHTML = products.map(p => {
    const imgs = getImages(p);
    return `
    <a class="product-card" href="product.html?id=${p.id}">
      <div class="thumb">
        ${imgs.length ? `<img src="${imgs[0]}" alt="${p.name}" loading="lazy">` : PLACEHOLDER_ICON}
      </div>
      <div class="body">
        <span class="cat">${p.category}</span>
        <p class="price">${p.price || ""}</p>
        <h3>${p.name}</h3>
        <p>${p.shortDesc}</p>
      </div>
    </a>
  `;
  }).join("");
}

// ============================================
// Render category-locked page (e.g. flow-transmitter.html)
// Reads window.PAGE_CATEGORY, set inline in each category page's <script> tag
// ============================================
async function initCategoryPage() {
  const grid = document.getElementById("category-grid");
  if (!grid || typeof window.PAGE_CATEGORY === "undefined") return;

  renderSidebar(window.PAGE_CATEGORY);

  const products = await loadProducts();
  const filtered = products.filter(p => p.category === window.PAGE_CATEGORY);

  const countEl = document.getElementById("result-count");
  if (countEl) countEl.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;

  renderGrid(filtered, grid);
  initViewToggle(grid);
}

// ============================================
// Render single product (product.html)
// ============================================
async function initProductPage() {
  const container = document.getElementById("product-detail");
  if (!container) return;

  const id = Number(new URLSearchParams(window.location.search).get("id"));
  const products = await loadProducts();
  const p = products.find(prod => prod.id === id);

  if (!p) {
    container.innerHTML = `<div class="empty-state">Product not found. <a href="javascript:history.back()" style="color:var(--orange-dim)">Go back</a></div>`;
    return;
  }

  document.title = `${p.name} — ${BUSINESS_NAME}`;

  const imgs = getImages(p);
  const specRows = Object.entries(p.specs).map(([k, v]) =>
    `<tr><td>${k}</td><td>${v}</td></tr>`
  ).join("");

  const thumbStrip = imgs.length > 1 ? `
    <div class="thumb-strip" id="thumb-strip">
      ${imgs.map((src, i) => `
        <button class="${i === 0 ? "active" : ""}" data-src="${src}">
          <img src="${src}" alt="${p.name} view ${i + 1}">
        </button>
      `).join("")}
    </div>
  ` : "";

  container.innerHTML = `
    <div class="image-panel-wrap">
      <div class="image-panel" id="main-image-panel">
        ${imgs.length ? `<img src="${imgs[0]}" alt="${p.name}" id="main-image" class="zoomable">` : PLACEHOLDER_ICON}
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
    <span class="cat-tag">${p.category}</span>
    ${p.brand ? `<div class="brand-tag">Brand: <strong>${p.brand}</strong></div>` : ""}
    <h1>${p.name}</h1>
    ${p.price ? `<div class="price-tag">${p.price}</div>` : ""}
    <p class="desc">${p.description}</p>
      <table class="spec-table">${specRows}</table>
      ${p.features && p.features.length ? `
        <div class="features-block">
          <h3>Key Features</h3>
          <ul class="features-list">
            ${p.features.map(f => `<li>${f}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
      <a class="whatsapp-btn" href="${waLink(p.name)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.93 1.38-.49.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.37c.26-.28.56-.35.75-.35.19 0 .38 0 .54.01.17.01.41-.07.64.49.24.58.81 2 .88 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.21.72-.84.91-1.13.19-.29.38-.24.64-.15.26.1 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.17 1.36z"/></svg>
        Order via WhatsApp
      </a>
    </div>
  `;

  let currentIndex = 0;

  function showImage(index) {
    if (!imgs.length) return;
    currentIndex = (index + imgs.length) % imgs.length;
    document.getElementById("main-image").src = imgs[currentIndex];
    const strip = document.getElementById("thumb-strip");
    if (strip) {
      strip.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === currentIndex));
    }
  }

  const strip = document.getElementById("thumb-strip");
  if (strip) {
    strip.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const idx = Array.from(strip.children).indexOf(btn);
      showImage(idx);
    });
  }

  const prevBtn = document.getElementById("img-prev");
  const nextBtn = document.getElementById("img-next");
  if (prevBtn) prevBtn.addEventListener("click", () => showImage(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => showImage(currentIndex + 1));

  const mainImg = document.getElementById("main-image");
  if (mainImg) {
    mainImg.addEventListener("click", () => openLightbox(mainImg.src, p.name));
  }
}

// ============================================
// Lightbox — click main image to enlarge, click outside or press ESC to close
// ============================================
function openLightbox(src, alt) {
  let overlay = document.getElementById("lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <img class="lightbox-img" id="lightbox-img" src="" alt="">
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.classList.contains("lightbox-close") || e.target.id === "lightbox-img") {
        closeLightbox();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  document.getElementById("lightbox-img").src = src;
  document.getElementById("lightbox-img").alt = alt;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const overlay = document.getElementById("lightbox-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", () => {
  initCategoryPage();
  initProductPage();
});
