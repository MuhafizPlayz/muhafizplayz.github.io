/* Episode page: /pages/episode.html?id=EPISODE_ID — info + admin-provided download links. */
(async () => {
  const app = document.getElementById("app");
  app.innerHTML = MP.loader();
  const ok = await MP.init();
  if (!ok) return MP.notConfigured(app);
  const id = MP.qs("id");
  if (!id || !MP.UUID.test(id)) return app.innerHTML = `<div class="wrap">${MP.notice("This episode could not be found.", "error")}</div>`;

  try {
    const e = await MP.q(sb.from("episodes").select("*,dramas(id,title,poster_url,backdrop_url,language,subtitle,kind,description)").eq("id", id).maybeSingle());
    if (!e || !e.dramas) { app.innerHTML = `<div class="wrap">${MP.notice("This episode could not be found or is not published.", "error")}</div>`; return; }
    const d = e.dramas, available = e.status === "available";
    let dl = null;
    if (available) dl = await MP.q(sb.from("episode_downloads").select("*").eq("episode_id", id).maybeSingle());
    const links = ["180p", "360p", "480p", "720p", "1080p"].map(q => ({ q, url: dl ? MP.safeUrl(dl["quality_" + q]) : "" })).filter(x => x.url);

    const sibs = await MP.q(sb.from("episodes").select("id,season_number,episode_number,status").eq("drama_id", d.id).eq("status", "available").order("season_number").order("episode_number"));
    const i = sibs.findIndex(x => x.id === e.id), prev = sibs[i - 1], next = sibs[i + 1];

    const facts = [["Season", e.season_number], ["Episode", e.episode_number], ["Release", MP.fmtDate(e.release_date)], ["Subtitles", d.subtitle], ["Language", d.language]]
      .filter(f => f[1]).map(f => `<div class="fact"><span>${f[0]}</span><strong>${MP.esc(f[1])}</strong></div>`).join("");
    const dlHtml = !available ? MP.notice("This episode is coming soon.")
      : links.length ? `<div class="dl-buttons">${links.map(l => `<a class="btn btn-primary" href="${MP.esc(l.url)}" target="_blank" rel="noopener nofollow">${l.q}</a>`).join("")}</div>`
      : MP.notice("Download link not available");
    const title = e.title || `Episode ${e.episode_number}`;

    app.innerHTML = `<div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a> / <a href="drama.html?id=${d.id}">${MP.esc(d.title)}</a> / Episode ${e.episode_number}</nav>
      <div class="detail wide"><div class="detail-poster">${MP.img(e.thumbnail_url || d.backdrop_url || d.poster_url, title)}</div>
      <div><h1>${MP.esc(d.title)}</h1><p style="color:var(--accent);font-weight:700;margin-bottom:6px">Episode ${e.episode_number}${e.title ? ": " + MP.esc(e.title) : ""}</p>
      <div class="facts">${facts}</div><p class="desc">${MP.esc(e.description || "No description has been added yet.")}</p></div></div>
      <div class="dl-box"><h2>Download / Watch</h2><p class="dl-note">Links are provided by the site administrator and open on an external page.</p>${dlHtml}</div>
      <div class="ad-slot" data-ad="episode_page"></div>
      <div class="ep-nav">${prev ? `<a class="btn btn-ghost" href="episode.html?id=${prev.id}">&larr; Episode ${prev.episode_number}</a>` : "<span></span>"}<a class="btn" href="drama.html?id=${d.id}">All episodes</a>${next ? `<a class="btn btn-ghost" href="episode.html?id=${next.id}">Episode ${next.episode_number} &rarr;</a>` : "<span></span>"}</div></div>`;
    MP.renderAds();

    const path = `pages/episode.html?id=${e.id}`, dpath = `pages/drama.html?id=${d.id}`;
    MP.seo.set({ title: `${d.title} Episode ${e.episode_number}`, description: e.description || `Details for ${d.title}, season ${e.season_number} episode ${e.episode_number}.`, image: e.thumbnail_url || d.poster_url, path, type: "video.episode",
      jsonLd: [MP.seo.clean({ "@context": "https://schema.org", "@type": "TVEpisode", name: title, episodeNumber: e.episode_number, description: e.description, datePublished: e.release_date, image: MP.safeUrl(e.thumbnail_url),
        partOfSeason: { "@type": "TVSeason", seasonNumber: e.season_number }, partOfSeries: { "@type": "TVSeries", name: d.title, url: MP.siteRoot() + dpath } }),
        MP.seo.breadcrumbs([{ name: "Home", path: "" }, { name: d.title, path: dpath }, { name: "Episode " + e.episode_number, path }])] });
  } catch (err) { MP.showError(app, err); }
})();
