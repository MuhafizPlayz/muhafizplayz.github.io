/* Search page: /pages/search.html?q=TEXT — searches published titles. */
(async () => {
  const out = document.getElementById("results"), input = document.getElementById("q");
  const ok = await MP.init();
  MP.seo.set({ title: "Search", description: "Search titles on the site.", path: "pages/search.html", noindex: true });
  if (!ok) return MP.notConfigured(out);
  const term = (MP.qs("q") || "").replace(/[%_,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  input.value = term;
  if (!term) { out.innerHTML = MP.notice("Type a title to search."); return; }
  out.innerHTML = MP.loader();
  try {
    const rows = await MP.q(sb.from("dramas").select("id,title,poster_url,language,kind,categories(name),episodes(count)").eq("published", true).ilike("title", `%${term}%`).order("title").limit(60));
    out.innerHTML = rows.length ? `<div class="grid">${rows.map(MP.dramaCard).join("")}</div>` : `<div class="empty">No results for "${MP.esc(term)}". Try a different word.</div>`;
  } catch (e) { MP.showError(out, e); }
})();
