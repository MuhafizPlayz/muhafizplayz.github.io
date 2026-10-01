/* Muhafız Playz — dynamic SEO tags + structured data (JSON-LD). Exposes `MP.seo`.
   GitHub Pages is static, so these tags are written by JavaScript in the browser.
   Google renders JavaScript, but indexing is never guaranteed. */
MP.seo = (() => {
  function meta(attr, key, content) {
    let m = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.setAttribute("content", content);
  }
  function set({ title, description, image, path = "", type = "website", jsonLd = [], noindex = false }) {
    const s = MP.state.settings;
    const siteName = s.site_name || "Muhafız Playz";
    const fullTitle = title ? `${title} | ${siteName}` : (s.site_title || siteName);
    const desc = (description || s.default_description || "").replace(/\s+/g, " ").trim().slice(0, 300);
    const img = MP.safeUrl(image) || MP.safeUrl(s.default_social_image) || new URL(MP.root + "assets/logo/logo.png", location.href).href;
    const url = MP.siteRoot() + path;
    document.title = fullTitle;
    meta("name", "description", desc);
    if (noindex) meta("name", "robots", "noindex,follow");
    let c = document.head.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement("link"); c.rel = "canonical"; document.head.appendChild(c); }
    c.href = url;
    meta("property", "og:title", fullTitle); meta("property", "og:description", desc);
    meta("property", "og:image", img); meta("property", "og:url", url);
    meta("property", "og:type", type); meta("property", "og:site_name", siteName);
    meta("name", "twitter:card", "summary_large_image"); meta("name", "twitter:title", fullTitle);
    meta("name", "twitter:description", desc); meta("name", "twitter:image", img);
    document.querySelectorAll("script[data-mp-ld]").forEach(n => n.remove());
    jsonLd.filter(Boolean).forEach(obj => {
      const sc = document.createElement("script"); sc.type = "application/ld+json"; sc.dataset.mpLd = "1";
      sc.textContent = JSON.stringify(obj); document.head.appendChild(sc);
    });
  }
  const clean = o => JSON.parse(JSON.stringify(o, (k, v) => (v === "" || v == null ? undefined : v)));
  function orgAndSite() {
    const s = MP.state.settings, base = MP.siteRoot();
    const logo = MP.safeUrl(s.logo_url) || new URL(MP.root + "assets/logo/logo.png", location.href).href;
    const sameAs = MP.state.social.map(x => MP.safeUrl(x.url)).filter(Boolean);
    return [
      clean({ "@context": "https://schema.org", "@type": "Organization", name: s.site_name, url: base, logo, sameAs: sameAs.length ? sameAs : undefined }),
      clean({ "@context": "https://schema.org", "@type": "WebSite", name: s.site_name, url: base,
        potentialAction: { "@type": "SearchAction", target: base + "pages/search.html?q={search_term_string}", "query-input": "required name=search_term_string" } })
    ];
  }
  function breadcrumbs(items) { // items: [{name, path}]
    const base = MP.siteRoot();
    return clean({ "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: base + it.path })) });
  }
  return { set, clean, orgAndSite, breadcrumbs };
})();
