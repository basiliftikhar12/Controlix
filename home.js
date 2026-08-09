// ===== Hero slider =====
(function () {
  const slides = document.querySelectorAll(".slide");
  const dotsWrap = document.getElementById("slider-dots");
  let current = 0;
  let timer;

  if (!slides.length) return;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll("button");

  function goTo(i) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = (i + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots[current].classList.add("active");
    resetTimer();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(next, 5500);
  }

  document.getElementById("arrow-next").addEventListener("click", next);
  document.getElementById("arrow-prev").addEventListener("click", prev);

  resetTimer();
})();

// ===== Mobile nav toggle =====
(function () {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle) return;
  toggle.addEventListener("click", () => nav.classList.toggle("mobile-open"));
})();

// ===== Products dropdown (click to open) =====
(function () {
  const btn = document.getElementById("products-dropdown-btn");
  const menu = document.getElementById("products-dropdown-menu");
  if (!btn || !menu) return;

  function closeMenu() {
    menu.classList.remove("open");
    btn.classList.remove("open");
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
    btn.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
})();

// ===== Sitewide inline search bar with live dropdown =====
// Injected here (rather than into each HTML file) because home.js already
// loads on every page. The search box sits inline in the nav; as the user
// types, matching products appear in a dropdown automatically (no click or
// Enter needed). Pressing Enter still goes to search.html for a full list.
// Self-contained on purpose (own fetch + own fuzzy matcher) so it works on
// EVERY page, including about.html/contact.html which don't load products-app.js.
(function () {
  const headerWrap = document.querySelector(".header-wrap");
  const navToggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!headerWrap || !nav) return;

  const wrap = document.createElement("div");
  wrap.className = "nav-search-wrap";
  wrap.innerHTML = `
    <div class="nav-search-box" id="nav-search-box">
      <button type="button" class="nav-search-icon-btn" id="nav-search-icon-btn" aria-label="Open search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      <input type="text" id="nav-search-input" placeholder="Search products..." autocomplete="off">
    </div>
    <div class="nav-search-dropdown" id="nav-search-dropdown"></div>
  `;

  // Group nav + (search/hamburger) together so header-wrap is back to a
  // clean 2-way split: brand-block | nav-group. Without this, header-wrap
  // would space-between across 3 items (brand, nav, actions) instead of 2,
  // which is what nudged the desktop nav position and pill gap last time.
  const navGroup = document.createElement("div");
  navGroup.className = "nav-group";
  headerWrap.insertBefore(navGroup, nav);
  navGroup.appendChild(nav);

  const actions = document.createElement("div");
  actions.className = "header-actions";
  if (navToggle) {
    navGroup.appendChild(actions);
    actions.appendChild(wrap);
    actions.appendChild(navToggle); // moves the existing button; its click listener stays intact
  } else {
    navGroup.appendChild(actions);
    actions.appendChild(wrap);
  }

  const input = wrap.querySelector("#nav-search-input");
  const dropdown = wrap.querySelector("#nav-search-dropdown");
  const searchBox = wrap.querySelector("#nav-search-box");
  const iconBtn = wrap.querySelector("#nav-search-icon-btn");

  // Icon tap: on mobile this expands the collapsed pill into a visible input
  // (see the max-width:900px rules in home.css). On desktop the input is
  // already always visible, so this just focuses it — harmless either way.
  iconBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    searchBox.classList.add("expanded");
    setTimeout(() => input.focus(), 50);
  });

  let productsCache = null;
  let debounceTimer = null;

  async function getProducts() {
    if (!productsCache) {
      const res = await fetch("products.json");
      productsCache = await res.json();
    }
    return productsCache;
  }

  // ---- Small, self-contained fuzzy matcher (typo-tolerant) ----
  // Matches ONLY name + shortDesc, as requested.
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[m][n];
  }
  function fuzzyWordMatch(word, target) {
    if (!word || !target) return false;
    if (target.includes(word)) return true;
    const maxDist = word.length <= 4 ? 1 : 2;
    return levenshtein(word, target) <= maxDist;
  }
  function matchProducts(query, products) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!queryWords.length) return [];
    const scored = products.map(p => {
      const haystack = [p.name, p.shortDesc].filter(Boolean).join(" ").toLowerCase();
      const haystackWords = haystack.split(/\W+/).filter(Boolean);
      let score = 0;
      queryWords.forEach(qw => {
        haystackWords.forEach(hw => {
          if (hw === qw) score += 3;
          else if (fuzzyWordMatch(qw, hw)) score += 1;
        });
      });
      return { product: p, score };
    });
    return scored.filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.product);
  }
  function firstImage(p) {
    if (Array.isArray(p.images) && p.images.length) return p.images[0];
    if (p.image) return p.image;
    return "";
  }

  function renderDropdown(results) {
    if (!results) {
      dropdown.classList.remove("open");
      dropdown.innerHTML = "";
      return;
    }
    if (!results.length) {
      dropdown.innerHTML = `<div class="nav-search-empty">No products found.</div>`;
      dropdown.classList.add("open");
      return;
    }
    const top = results.slice(0, 8);
    dropdown.innerHTML = top.map(p => {
      const img = firstImage(p);
      return `
        <a class="nav-search-item" href="product.html?id=${p.id}">
          <div class="nav-search-thumb">${img ? `<img src="${img}" alt="${p.name}">` : ""}</div>
          <div class="nav-search-info">
            <div class="nav-search-name">${p.name}</div>
            <div class="nav-search-desc">${p.shortDesc || ""}</div>
          </div>
        </a>
      `;
    }).join("");
    dropdown.classList.add("open");
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (!query) { renderDropdown(null); return; }
    debounceTimer = setTimeout(async () => {
      const products = await getProducts();
      renderDropdown(matchProducts(query, products));
    }, 150);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) dropdown.classList.add("open");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    }
    if (e.key === "Escape") dropdown.classList.remove("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      dropdown.classList.remove("open");
      searchBox.classList.remove("expanded");
    }
  });
})();

// ===== Featured products on Home page (random selection, load more) =====
// Reuses loadProducts() and renderGrid() defined in products-app.js —
// make sure products-app.js is loaded BEFORE this file in index.html.
(function () {
  const grid = document.getElementById("featured-grid");
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (!grid || !loadMoreBtn) return;

  const BATCH_SIZE = 10; // 2 rows of 5 on desktop
  let shuffled = [];
  let shown = 0;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderBatch() {
    shown = Math.min(shown + BATCH_SIZE, shuffled.length);
    renderGrid(shuffled.slice(0, shown), grid);
    if (shown >= shuffled.length) {
      loadMoreBtn.textContent = "All Products Loaded";
      loadMoreBtn.disabled = true;
    }
  }

  loadProducts().then(products => {
    shuffled = shuffle(products);
    renderBatch();
  });

  loadMoreBtn.addEventListener("click", renderBatch);
})();

// ===== Floating WhatsApp button (appears on every page) =====
(function () {
  const WHATSAPP_NUMBER = "923104667746"; // same number used across the site
  const DEFAULT_MESSAGE = "Hi, I'd like to know more about your products.";

  const link = document.createElement("a");
  link.id = "whatsapp-float";
  link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", "Chat with us on WhatsApp");
  link.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.93 1.38-.49.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.37c.26-.28.56-.35.75-.35.19 0 .38 0 .54.01.17.01.41-.07.64.49.24.58.81 2 .88 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.21.72-.84.91-1.13.19-.29.38-.24.64-.15.26.1 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.17 1.36z"/></svg>
  `;
  document.body.appendChild(link);
})();
