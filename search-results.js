// ============================================
// Powers search.html — reads the ?q= query param,
// runs it through searchProducts() (defined in products-app.js),
// and renders matches using the same renderGrid() used on category pages.
// ============================================
(function () {
  async function initSearchResults() {
    const grid = document.getElementById("search-grid");
    if (!grid) return;

    const params = new URLSearchParams(window.location.search);
    const query = (params.get("q") || "").trim();

    const heading = document.getElementById("search-heading");
    const countEl = document.getElementById("result-count");

    if (heading) heading.textContent = query ? `Results for "${query}"` : "Search Results";
    document.title = query ? `Search: ${query} — Controlix` : "Search — Controlix";

    if (!query) {
      grid.innerHTML = `<div class="empty-state">Type something in the search bar to find products.</div>`;
      if (countEl) countEl.textContent = "";
      return;
    }

    const products = await loadProducts();
    const results = searchProducts(query, products);

    if (countEl) {
      countEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"} found`;
    }
    renderGrid(results, grid);
  }

  document.addEventListener("DOMContentLoaded", initSearchResults);
})();
