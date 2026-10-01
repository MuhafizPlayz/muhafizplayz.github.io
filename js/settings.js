/* Muhafız Playz — admin views: Social Links, Website Settings, Contact Settings, SEO Settings, Advertisements. */
(() => {
  const A = Admin, esc = MP.esc;
  const PLATFORMS = ["facebook", "whatsapp", "whatsapp_channel", "instagram", "tiktok", "telegram", "youtube"];
  const urlOrEmpty = (v, label) => { v = (v || "").trim(); if (v && !MP.safeUrl(v)) A.bad(`${label} must be a full link starting with https:// or http://`); return v || null; };

  // ----- Website settings -----
  A.views.website = async el => {
    const s = await MP.q(sb.from("site_settings").select("*").eq("id", 1).maybeSingle()) || {};
    el.innerHTML = "<h1>Website Settings</h1>";
    A.formPanel(el, "Brand", `${A.field("Site name", "site_name", s.site_name, { req: true })}${A.field("Tagline", "tagline", s.tagline)}
      ${MPStorage.field("logo_url", "Logo", "logo", s.logo_url, "PNG with transparent background works best. If empty, the default Muhafız Playz logo is used.")}
      ${MPStorage.field("favicon_url", "Favicon (browser tab icon)", "favicon", s.favicon_url, "Square PNG, at least 16x16 (64x64 recommended).")}`,
      async fd => {
        const name = fd.get("site_name").trim(); if (!name) A.bad("Site name is required.");
        await A.changed(sb.from("site_settings").upsert({ id: 1, site_name: name, tagline: fd.get("tagline").trim() || null, logo_url: fd.get("logo_url") || null, favicon_url: fd.get("favicon_url") || null }).select("id"));
      });
  };

  // ----- SEO settings + sitemap generator -----
  A.views.seo = async el => {
    const s = await MP.q(sb.from("site_settings").select("*").eq("id", 1).maybeSingle()) || {};
    el.innerHTML = "<h1>SEO Settings</h1>";
    A.formPanel(el, "Search and sharing defaults", `${A.field("Site URL", "site_url", s.site_url, { type: "url", full: true, ph: "https://yourname.github.io/your-repo/", help: "The real public address of your site, ending with /. Used for canonical links and the sitemap." })}
      ${A.field("Site title", "site_title", s.site_title, { full: true })}${A.area("Default description", "default_description", s.default_description, { help: "About 150 characters. Used when a page has no description of its own." })}
      ${MPStorage.field("default_social_image", "Default social image", "social", s.default_social_image, "Shown when links are shared. At least 600x315.")}`,
      async fd => {
        const site = urlOrEmpty(fd.get("site_url"), "Site URL");
        await A.changed(sb.from("site_settings").upsert({ id: 1, site_url: site ? site.replace(/\/?$/, "/") : null, site_title: fd.get("site_title").trim() || null, default_description: fd.get("default_description").trim() || null, default_social_image: fd.get("default_social_image") || null }).select("id"));
      });
    const box = document.createElement("div"); box.className = "panel";
    box.innerHTML = `<h2>Sitemap generator</h2><p class="dl-note">GitHub Pages cannot update sitemap.xml by itself. Click Generate, download the file, and upload it to your repository root (replace the old sitemap.xml). Repeat after adding many new titles.</p>
      <div class="toolbar"><button class="btn btn-primary" id="gen">Generate sitemap.xml</button><button class="btn" id="dlx" disabled>Download sitemap.xml</button></div>
      <div class="field"><textarea id="xml" readonly style="min-height:200px;font-family:monospace;font-size:.8rem"></textarea></div>`;
    el.appendChild(box);
    box.querySelector("#gen").onclick = async () => {
      try {
        const { data: st } = await sb.from("site_settings").select("site_url").eq("id", 1).maybeSingle();
        const base = MP.safeUrl(st && st.site_url); if (!base) A.bad("Save your Site URL above first.");
        const [dr, ep, ca] = await Promise.all([
          MP.q(sb.from("dramas").select("id,updated_at").eq("published", true)),
          MP.q(sb.from("episodes").select("id,updated_at,dramas!inner(published)").eq("published", true).eq("status", "available").eq("dramas.published", true)),
          MP.q(sb.from("categories").select("slug"))]);
        const u = (p, d, pr) => `  <url><loc>${esc(base + p)}</loc>${d ? `<lastmod>${d.slice(0, 10)}</lastmod>` : ""}<priority>${pr}</priority></url>`;
        const today = new Date().toISOString().slice(0, 10);
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + [
          u("", today, "1.0"), u("pages/category.html", today, "0.6"), u("pages/about.html", null, "0.3"), u("pages/contact.html", null, "0.3"), u("pages/privacy.html", null, "0.2"), u("pages/terms.html", null, "0.2"), u("pages/dmca.html", null, "0.2"),
          ...ca.map(c => u("pages/category.html?slug=" + encodeURIComponent(c.slug), today, "0.6")),
          ...dr.map(d => u("pages/drama.html?id=" + d.id, d.updated_at, "0.8")), ...ep.map(e => u("pages/episode.html?id=" + e.id, e.updated_at, "0.7"))].join("\n") + "\n</urlset>\n";
        box.querySelector("#xml").value = xml; box.querySelector("#dlx").disabled = false;
        A.toast(`Sitemap ready: ${dr.length + ep.length + ca.length + 7} URLs.`);
      } catch (e) { A.toast(e.userMessage || MP.errMsg(e, true), "error"); }
    };
    box.querySelector("#dlx").onclick = () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([box.querySelector("#xml").value], { type: "application/xml" })); a.download = "sitemap.xml"; a.click(); URL.revokeObjectURL(a.href);
    };
  };

  // ----- Social links -----
  A.views.social = async el => {
    const rows = await MP.q(sb.from("social_links").select("*"));
    const by = Object.fromEntries(rows.map(r => [r.platform, r]));
    el.innerHTML = "<h1>Social Links</h1>";
    A.formPanel(el, "Links shown in the website footer", PLATFORMS.map(p => `${A.field(MP.SOCIAL_LABELS[p], "url_" + p, (by[p] || {}).url, { type: "url", ph: "https://..." })}${A.check("Show", "on_" + p, by[p] ? by[p].enabled : true)}`).join(""),
      async fd => {
        const recs = PLATFORMS.map((p, i) => ({ platform: p, url: urlOrEmpty(fd.get("url_" + p), MP.SOCIAL_LABELS[p] + " link"), enabled: fd.get("on_" + p) === "on", sort_order: i + 1 }));
        await A.changed(sb.from("social_links").upsert(recs, { onConflict: "platform" }).select("platform"));
      }, "Empty links are hidden automatically.");
  };

  // ----- Contact settings -----
  A.views.contact = async el => {
    const c = await MP.q(sb.from("contact_settings").select("*").eq("id", 1).maybeSingle()) || {};
    el.innerHTML = "<h1>Contact Settings</h1>";
    A.formPanel(el, "Contact details", `${A.field("WhatsApp number", "whatsapp_number", c.whatsapp_number, { ph: "923001234567", help: "Digits only with country code, no + or spaces. The button becomes https://wa.me/NUMBER. This number is public." })}
      ${A.field("Public email", "email", c.email, { type: "email", help: "Shown on the contact page and in the footer. Leave empty to hide." })}
      ${A.field("Telegram link", "telegram_url", c.telegram_url, { type: "url", ph: "https://t.me/yourname" })}
      ${A.check("Show WhatsApp button", "show_whatsapp_button", c.show_whatsapp_button !== false)}${A.check("Show Telegram button", "show_telegram_button", c.show_telegram_button !== false)}
      ${A.area("Contact text", "contact_text", c.contact_text)}`,
      async fd => {
        const num = (fd.get("whatsapp_number") || "").replace(/\D/g, "");
        if (num && (num.length < 7 || num.length > 15)) A.bad("WhatsApp number must have 7 to 15 digits including the country code.");
        const email = fd.get("email").trim(); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) A.bad("Email address is not valid.");
        await A.changed(sb.from("contact_settings").upsert({ id: 1, whatsapp_number: num || null, email: email || null, telegram_url: urlOrEmpty(fd.get("telegram_url"), "Telegram link"),
          show_whatsapp_button: fd.get("show_whatsapp_button") === "on", show_telegram_button: fd.get("show_telegram_button") === "on", contact_text: fd.get("contact_text").trim() || null }).select("id"));
      });
  };

  // ----- Advertisements -----
  A.views.ads = async el => {
    const rows = await MP.q(sb.from("advertisements").select("*").order("slot"));
    const order = ["header", "home_top", "home_middle", "home_bottom", "drama_page", "episode_page"];
    rows.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
    el.innerHTML = "<h1>Advertisements</h1>";
    A.formPanel(el, "Ad placements", rows.map(r => `<div class="field full" style="border-top:1px solid var(--line);padding-top:12px"><label>${esc(r.label || r.slot)}</label>${A.check("Enabled", "on_" + r.slot, r.enabled)}
      <textarea name="code_${r.slot}" placeholder="Paste the code from your approved ad network here" style="min-height:90px;font-family:monospace;font-size:.82rem;padding:10px;border-radius:8px;background:var(--bg);border:1px solid var(--line);color:var(--text)">${esc(r.code || "")}</textarea></div>`).join(""),
      async fd => {
        const recs = rows.map(r => ({ slot: r.slot, label: r.label, enabled: fd.get("on_" + r.slot) === "on", code: (fd.get("code_" + r.slot) || "").trim() || null }));
        await A.changed(sb.from("advertisements").upsert(recs, { onConflict: "slot" }).select("slot"));
      }, "Only paste code from an ad network that has approved your site. The code runs on your public pages, so never paste code you do not trust. Slots stay invisible while disabled or empty, and the site works without ads. Do not use deceptive ads, fake download buttons or forced clicks.");
  };
})();
