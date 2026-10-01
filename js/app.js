/* Muhafız Playz — shared helpers, header/footer, branding, ads. Exposes global `MP`. */
const MP = (() => {
  const root = document.body.dataset.root || "";
  const state = {
    settings: { site_name: "Muhafız Playz", tagline: "", logo_url: "", favicon_url: "", site_url: "", site_title: "Muhafız Playz", default_description: "", default_social_image: "" },
    social: [], contact: {}, categories: []
  };
  const SOCIAL_LABELS = { facebook: "Facebook", whatsapp: "WhatsApp", whatsapp_channel: "WhatsApp Channel", instagram: "Instagram", tiktok: "TikTok", telegram: "Telegram", youtube: "YouTube" };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const qs = k => new URLSearchParams(location.search).get(k);
  const safeUrl = u => { if (!u) return ""; try { const x = new URL(String(u).trim()); return (x.protocol === "http:" || x.protocol === "https:") ? x.href : ""; } catch { return ""; } };
  const fmtDate = d => { if (!d) return ""; const x = new Date(d + "T00:00:00"); return isNaN(x) ? "" : x.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); };
  const placeholder = root + "assets/posters/placeholder.svg";
  const img = (u, alt, cls = "") => `<img ${cls ? `class="${cls}"` : ""} src="${esc(safeUrl(u) || placeholder)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${placeholder}'">`;
  const waLink = n => { const d = String(n || "").replace(/\D/g, ""); return d.length >= 7 && d.length <= 15 ? "https://wa.me/" + d : ""; };
  const loader = () => '<div class="loader" role="status" aria-label="Loading"></div>';
  const notice = (msg, type = "") => `<div class="notice ${type}" role="${type === "error" ? "alert" : "status"}">${esc(msg)}</div>`;

  function errMsg(e, detail = false) {
    const m = String((e && e.message) || e || ""), c = e && e.code;
    if (!navigator.onLine || /failed to fetch|networkerror|load failed/i.test(m)) return "Network problem. Check your internet connection and try again.";
    if (c === "42501" || /row-level security|permission denied/i.test(m)) return "Permission denied. Make sure you are signed in as an administrator.";
    if (c === "23505") return "That value already exists (for example a duplicate slug or episode number).";
    if (c === "23503") return "This item is linked to other data. Remove the linked items first.";
    if (c === "23514") return "One of the values is not allowed (links must start with http:// or https://).";
    if (/jwt|not authenticated/i.test(m)) return "Your session expired. Please sign in again.";
    return detail && m ? "Something went wrong: " + m : "Something went wrong. Please try again in a moment.";
  }
  function showError(el, e) { el.innerHTML = notice(errMsg(e), "error"); console.error(e); }
  function notConfigured(el) {
    el.innerHTML = notice("This website is not connected to its database yet. The owner needs to add the Supabase URL and public key in js/config.js.", "error");
  }
  async function q(promise) { const { data, error } = await promise; if (error) throw error; return data; }

  async function loadSettings() {
    if (!sb) return;
    const [s, so, c, cat] = await Promise.allSettled([
      q(sb.from("site_settings").select("*").eq("id", 1).maybeSingle()),
      q(sb.from("social_links").select("*").eq("enabled", true).order("sort_order")),
      q(sb.from("contact_settings").select("*").eq("id", 1).maybeSingle()),
      q(sb.from("categories").select("*").order("sort_order").order("name"))
    ]);
    if (s.status === "fulfilled" && s.value) Object.assign(state.settings, Object.fromEntries(Object.entries(s.value).filter(([, v]) => v !== null && v !== "")));
    if (so.status === "fulfilled") state.social = (so.value || []).filter(x => safeUrl(x.url));
    if (c.status === "fulfilled" && c.value) state.contact = c.value;
    if (cat.status === "fulfilled") state.categories = cat.value || [];
  }

  function siteRoot() {
    const base = safeUrl(state.settings.site_url);
    return base ? base.replace(/\/?$/, "/") : new URL(root || "./", location.href).href;
  }

  function renderHeader(active) {
    const el = document.getElementById("site-header"); if (!el) return;
    const s = state.settings;
    const logo = safeUrl(s.logo_url)
      ? `<img src="${esc(s.logo_url)}" alt="${esc(s.site_name)}">`
      : `<img src="${root}assets/logo/icon.png" alt=""><span>${esc(s.site_name)}</span>`;
    const navCats = state.categories.filter(c => c.show_in_nav).map(c => `<a href="${root}pages/category.html?slug=${encodeURIComponent(c.slug)}" ${active === "cat:" + c.slug ? 'class="active"' : ""}>${esc(c.name)}</a>`).join("");
    const wa = waLink(state.contact.whatsapp_number);
    const contactBtn = wa && state.contact.show_whatsapp_button !== false
      ? `<a class="btn btn-primary btn-sm hide-mobile" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`
      : `<a class="btn btn-ghost btn-sm hide-mobile" href="${root}pages/contact.html">Contact</a>`;
    el.className = "site-header";
    el.innerHTML = `<div class="wrap">
      <a class="brand" href="${root}index.html" aria-label="${esc(s.site_name)} home">${logo}</a>
      <nav class="nav" id="nav" aria-label="Main">
        <a href="${root}index.html" ${active === "home" ? 'class="active"' : ""}>Home</a>${navCats}
        <a href="${root}pages/category.html" ${active === "categories" ? 'class="active"' : ""}>Categories</a>
      </nav>
      <div class="header-actions">
        <a class="icon-btn" href="${root}pages/search.html" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></a>
        ${contactBtn}
        <button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div></div><div class="ad-slot" data-ad="header"></div>`;
    const t = document.getElementById("menu-toggle"), n = document.getElementById("nav");
    t.addEventListener("click", () => { const o = n.classList.toggle("open"); t.setAttribute("aria-expanded", o); });
  }

  function renderFooter() {
    const el = document.getElementById("site-footer"); if (!el) return;
    const s = state.settings;
    const social = state.social.map(x => `<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(SOCIAL_LABELS[x.platform] || x.platform)}</a>`).join("");
    const contactLine = state.contact.email ? `<a href="mailto:${esc(state.contact.email)}">${esc(state.contact.email)}</a>` : "";
    el.className = "site-footer";
    el.innerHTML = `<div class="wrap"><div class="footer-grid">
      <div><a class="brand" href="${root}index.html">${esc(s.site_name)}</a><p style="margin-top:10px">${esc(s.tagline || s.default_description || "")}</p></div>
      <div><h3>Explore</h3><a href="${root}index.html">Home</a><a href="${root}pages/category.html">Categories</a><a href="${root}pages/search.html">Search</a><a href="${root}pages/about.html">About</a><a href="${root}pages/contact.html">Contact</a>${contactLine}</div>
      <div><h3>Legal</h3><a href="${root}pages/privacy.html">Privacy Policy</a><a href="${root}pages/terms.html">Terms of Use</a><a href="${root}pages/dmca.html">DMCA / Copyright</a>${social ? "<h3 style='margin-top:14px'>Follow</h3>" + social : ""}</div>
    </div><div class="copyright">&copy; ${new Date().getFullYear()} ${esc(s.site_name)}. All rights reserved.</div></div>`;
  }

  function applyBranding() {
    const s = state.settings;
    const fav = safeUrl(s.favicon_url) || root + "assets/logo/favicon.png";
    let l = document.querySelector('link[rel="icon"]');
    if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
    l.href = fav;
  }

  // Put trusted ad-network code (entered by the admin) into a slot, making <script> tags run.
  function injectAd(el, html) {
    const t = document.createElement("template"); t.innerHTML = html;
    t.content.querySelectorAll("script").forEach(old => {
      const s = document.createElement("script");
      [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent; old.replaceWith(s);
    });
    el.appendChild(t.content);
  }
  async function renderAds() {
    if (!sb) return;
    const slots = [...document.querySelectorAll(".ad-slot[data-ad]:not([data-filled])")];
    if (!slots.length) return;
    try {
      const ads = await q(sb.from("advertisements").select("slot,code,enabled").eq("enabled", true));
      slots.forEach(el => {
        const ad = ads.find(a => a.slot === el.dataset.ad);
        el.dataset.filled = "1";
        if (ad && ad.code && ad.code.trim()) injectAd(el, ad.code);
      });
    } catch (e) { console.warn("Ads unavailable", e); }
  }

  async function init(opts = {}) {
    if (sb) { try { await loadSettings(); } catch (e) { console.warn(e); } }
    applyBranding(); renderHeader(opts.active); renderFooter(); renderAds();
    return !!sb;
  }

  function dramaCard(d) {
    const cnt = d.episodes && d.episodes[0] ? d.episodes[0].count : 0;
    const badge = d.kind === "movie" ? "Movie" : cnt ? `${cnt} ${cnt === 1 ? "episode" : "episodes"}` : "";
    return `<a class="card" href="${root}pages/drama.html?id=${d.id}"><div class="card-img">${img(d.poster_url, d.title)}${badge ? `<span class="card-badge">${esc(badge)}</span>` : ""}</div>
      <div class="card-body"><div class="card-title">${esc(d.title)}</div><div class="card-meta">${esc((d.categories && d.categories.name) || d.language || "")}</div></div></a>`;
  }

  return { root, state, esc, qs, safeUrl, fmtDate, img, waLink, loader, notice, errMsg, showError, notConfigured, q, init, renderAds, dramaCard, siteRoot, UUID, SOCIAL_LABELS, placeholder };
})();
