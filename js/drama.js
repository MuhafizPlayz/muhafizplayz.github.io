/* Drama detail page: /pages/drama.html?id=DRAMA_ID */
(async () => {
  const app = document.getElementById("app");
  app.innerHTML = MP.loader();
  const ok = await MP.init();
  if (!ok) return MP.notConfigured(app);
  const id = MP.qs("id");
  if (!id || !MP.UUID.test(id)) return app.innerHTML = `<div class="wrap">${MP.notice("This title could not be found.", "error")}</div>`;

  try {
    const d = await MP.q(sb.from("dramas").select("*,categories(name,slug)").eq("id", id).maybeSingle());
    if (!d) { app.innerHTML = `<div class="wrap">${MP.notice("This title could not be found or is not published.", "error")}</div>`; return; }
    const eps = await MP.q(sb.from("episodes").select("id,season_number,episode_number,title,status,release_date").eq("drama_id", id).order("season_number").order("episode_number"));
    const seasons = [...new Set(eps.map(e => e.season_number))];
    const statusLabel = { ongoing: "Ongoing", completed: "Completed", coming_soon: "Coming soon" }[d.status] || d.status;
    const facts = [["Category", d.categories && d.categories.name], ["Language", d.language], ["Subtitles", d.subtitle], ["Status", statusLabel], ["Release", MP.fmtDate(d.release_date)], ["Seasons", d.kind === "movie" ? "" : seasons.length || ""], ["Episodes", d.kind === "movie" ? "" : eps.length || ""]]
      .filter(f => f[1]).map(f => `<div class="fact"><span>${f[0]}</span><strong>${MP.esc(f[1])}</strong></div>`).join("");

    app.innerHTML = `<div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a> / ${d.categories ? `<a href="category.html?slug=${encodeURIComponent(d.categories.slug)}">${MP.esc(d.categories.name)}</a> / ` : ""}${MP.esc(d.title)}</nav>
      <div class="detail"><div class="detail-poster">${MP.img(d.poster_url, d.title)}</div>
      <div><h1>${MP.esc(d.title)}</h1><div class="facts">${facts}</div>
        <p class="desc">${MP.esc(d.description || "No description has been added yet.")}</p></div></div>
      <div class="ad-slot" data-ad="drama_page"></div>
      <section class="section" style="padding-top:10px" id="episodes"><div class="section-head"><h2>${d.kind === "movie" ? "Watch" : "Episodes"}</h2></div>
      <div class="season-tabs" id="tabs"></div><div class="ep-list" id="eps"></div></section></div>`;

    const list = document.getElementById("eps"), tabs = document.getElementById("tabs");
    const draw = season => {
      const rows = eps.filter(e => e.season_number === season);
      list.innerHTML = rows.length ? rows.map(e => {
        const label = `Episode ${e.episode_number}`;
        if (e.status !== "available") return `<div class="ep-row soon"><span class="num">${label}</span><span class="t">Coming Soon${e.release_date ? " (" + MP.esc(MP.fmtDate(e.release_date)) + ")" : ""}</span></div>`;
        return `<a class="ep-row" href="episode.html?id=${e.id}"><span class="num">${label}</span><span class="t">${MP.esc(e.title || "")}</span><span class="btn btn-sm btn-primary">Open</span></a>`;
      }).join("") : MP.notice("No episodes have been added yet.");
    };
    if (seasons.length > 1) {
      tabs.innerHTML = seasons.map((s, i) => `<button class="${i === 0 ? "on" : ""}" data-s="${s}">Season ${s}</button>`).join("");
      tabs.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; tabs.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); draw(+b.dataset.s); });
    } else tabs.remove();
    draw(seasons[0] || 1);
    MP.renderAds();

    const path = `pages/drama.html?id=${d.id}`;
    const availableEps = eps.filter(e => e.status === "available").length;
    const ld = d.kind === "movie"
      ? MP.seo.clean({ "@context": "https://schema.org", "@type": "Movie", name: d.title, description: d.description, image: MP.safeUrl(d.poster_url), datePublished: d.release_date })
      : MP.seo.clean({ "@context": "https://schema.org", "@type": "TVSeries", name: d.title, description: d.description, image: MP.safeUrl(d.poster_url), datePublished: d.release_date, numberOfEpisodes: availableEps || undefined, numberOfSeasons: seasons.length || undefined });
    MP.seo.set({ title: d.title, description: d.description || `Details and episodes of ${d.title}.`, image: d.poster_url, path, type: d.kind === "movie" ? "video.movie" : "video.tv_show",
      jsonLd: [ld, MP.seo.breadcrumbs([{ name: "Home", path: "" }, ...(d.categories ? [{ name: d.categories.name, path: "pages/category.html?slug=" + d.categories.slug }] : []), { name: d.title, path }])] });
  } catch (e) { MP.showError(app, e); }
})();
