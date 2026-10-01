/* Category page: /pages/category.html?slug=SLUG (titles in a category) or no slug (all categories). */
(async () => {
  const app = document.getElementById("app");
  app.innerHTML = MP.loader();
  const slug = MP.qs("slug");
  const ok = await MP.init({ active: slug ? "cat:" + slug : "categories" });
  if (!ok) return MP.notConfigured(app);

  if (!slug) {
    const cats = MP.state.categories;
    app.innerHTML = `<div class="wrap"><h1 class="page-title">Categories</h1><div class="section">${cats.length ? `<div class="cat-grid">${cats.map(c => `<a class="cat-tile" href="category.html?slug=${encodeURIComponent(c.slug)}">${MP.esc(c.name)}</a>`).join("")}</div>` : '<div class="empty">No categories yet.</div>'}</div></div>`;
    MP.seo.set({ title: "Categories", description: "Browse all categories.", path: "pages/category.html", jsonLd: [MP.seo.breadcrumbs([{ name: "Home", path: "" }, { name: "Categories", path: "pages/category.html" }])] });
    return;
  }
  const cat = MP.state.categories.find(c => c.slug === slug);
  if (!cat) { app.innerHTML = `<div class="wrap">${MP.notice("This category could not be found.", "error")}</div>`; return; }

  app.innerHTML = `<div class="wrap"><nav class="crumbs"><a href="../index.html">Home</a> / <a href="category.html">Categories</a> / ${MP.esc(cat.name)}</nav>
    <h1 class="page-title">${MP.esc(cat.name)}</h1><div class="section"><div class="grid" id="grid"></div><div id="more" style="text-align:center;margin-top:22px"></div></div></div>`;
  const grid = document.getElementById("grid"), more = document.getElementById("more"), PAGE = 24;
  let from = 0;
  async function load() {
    more.innerHTML = MP.loader();
    try {
      const rows = await MP.q(sb.from("dramas").select("id,title,poster_url,language,kind,categories(name),episodes(count)").eq("published", true).eq("category_id", cat.id).order("created_at", { ascending: false }).range(from, from + PAGE - 1));
      grid.insertAdjacentHTML("beforeend", rows.map(MP.dramaCard).join(""));
      from += rows.length;
      if (!grid.children.length) grid.outerHTML = '<div class="empty">Nothing in this category yet.</div>';
      more.innerHTML = rows.length === PAGE ? '<button class="btn" id="more-btn">Load more</button>' : "";
      const b = document.getElementById("more-btn"); if (b) b.onclick = load;
    } catch (e) { more.innerHTML = ""; MP.showError(more, e); }
  }
  await load();
  MP.seo.set({ title: cat.name, description: `Browse ${cat.name}.`, path: "pages/category.html?slug=" + cat.slug,
    jsonLd: [MP.seo.breadcrumbs([{ name: "Home", path: "" }, { name: "Categories", path: "pages/category.html" }, { name: cat.name, path: "pages/category.html?slug=" + cat.slug }])] });
})();
