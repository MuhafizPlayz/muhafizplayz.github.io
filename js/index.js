/* Homepage: hero, latest updates, category sections, featured, latest episodes, categories. */
(async () => {
  const app = document.getElementById("home");
  app.innerHTML = MP.loader();
  const ok = await MP.init({ active: "home" });
  if (!ok) return MP.notConfigured(app);

  const DRAMA_SEL = "id,title,slug,poster_url,backdrop_url,description,language,kind,featured,categories(name,slug),episodes(count)";
  const row = (title, items, link) => items.length ? `<section class="section"><div class="wrap"><div class="section-head"><h2>${MP.esc(title)}</h2>${link ? `<a href="${link}">View all</a>` : ""}</div><div class="grid">${items.map(MP.dramaCard).join("")}</div></div></section>` : "";

  try {
    const homeCats = MP.state.categories.filter(c => c.show_on_home).slice(0, 4);
    const [latest, featured, catRows, eps] = await Promise.all([
      MP.q(sb.from("dramas").select(DRAMA_SEL).eq("published", true).order("created_at", { ascending: false }).limit(12)),
      MP.q(sb.from("dramas").select(DRAMA_SEL).eq("published", true).eq("featured", true).order("updated_at", { ascending: false }).limit(12)),
      Promise.all(homeCats.map(c => MP.q(sb.from("dramas").select(DRAMA_SEL).eq("published", true).eq("category_id", c.id).order("created_at", { ascending: false }).limit(12)))),
      MP.q(sb.from("episodes").select("id,episode_number,season_number,title,thumbnail_url,created_at,dramas(id,title,poster_url,backdrop_url)").eq("published", true).eq("status", "available").order("created_at", { ascending: false }).limit(8))
    ]);

    if (!latest.length) {
      app.innerHTML = `<div class="wrap"><div class="empty"><h2>Nothing here yet</h2><p>New titles will appear soon. Please check back later.</p></div></div><div class="ad-slot" data-ad="home_bottom"></div>`;
      MP.seo.set({ path: "", jsonLd: MP.seo.orgAndSite() }); MP.renderAds(); return;
    }

    const hero = featured[0] || latest[0];
    const bg = MP.safeUrl(hero.backdrop_url) || MP.safeUrl(hero.poster_url);
    const heroHtml = `<section class="hero" ${bg ? `style="background-image:url('${MP.esc(bg)}')"` : ""}><div class="wrap">
      <div class="hero-tags">${hero.categories ? `<span class="tag accent">${MP.esc(hero.categories.name)}</span>` : ""}${hero.language ? `<span class="tag">${MP.esc(hero.language)}</span>` : ""}</div>
      <h1>${MP.esc(hero.title)}</h1>${hero.description ? `<p>${MP.esc(hero.description)}</p>` : ""}
      <div class="hero-actions"><a class="btn btn-primary" href="pages/drama.html?id=${hero.id}">View details</a></div></div></section>`;

    const catSections = homeCats.map((c, i) => row(c.name, catRows[i], `pages/category.html?slug=${encodeURIComponent(c.slug)}`)).join("");
    const epHtml = eps.length ? `<section class="section"><div class="wrap"><div class="section-head"><h2>Latest Episodes</h2></div><div class="ep-grid">${eps.map(e => `
      <a class="card ep-card" href="pages/episode.html?id=${e.id}"><div class="card-img">${MP.img(e.thumbnail_url || (e.dramas && (e.dramas.backdrop_url || e.dramas.poster_url)), e.dramas ? e.dramas.title : "Episode")}</div>
      <div class="card-body"><div class="card-title">${MP.esc(e.dramas ? e.dramas.title : "")}</div><div class="card-meta">Season ${e.season_number}, Episode ${e.episode_number}</div></div></a>`).join("")}</div></div></section>` : "";
    const cats = MP.state.categories.length ? `<section class="section"><div class="wrap"><div class="section-head"><h2>Categories</h2></div><div class="cat-grid">${MP.state.categories.map(c => `<a class="cat-tile" href="pages/category.html?slug=${encodeURIComponent(c.slug)}">${MP.esc(c.name)}</a>`).join("")}</div></div></section>` : "";

    app.innerHTML = heroHtml + `<div class="wrap"><div class="ad-slot" data-ad="home_top"></div></div>` +
      row("Latest Updates", latest) + catSections +
      `<div class="wrap"><div class="ad-slot" data-ad="home_middle"></div></div>` +
      row("Featured", featured) + epHtml + cats +
      `<div class="wrap"><div class="ad-slot" data-ad="home_bottom"></div></div>`;
    MP.renderAds();
    MP.seo.set({ path: "", jsonLd: MP.seo.orgAndSite() });
  } catch (e) { MP.showError(app, e); }
})();
