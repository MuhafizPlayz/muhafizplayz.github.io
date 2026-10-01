/* Muhafız Playz — admin dashboard core: shell, dashboard stats, dramas, episodes, categories. Exposes `Admin`. */
const Admin = (() => {
  const views = {}, state = { dramaId: null };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = MP.esc;
  const bad = msg => { throw Object.assign(new Error(msg), { userMessage: msg }); };

  function toast(msg, type = "ok") {
    const t = $("#toast"); t.textContent = msg; t.className = "toast show " + type;
    clearTimeout(t._t); t._t = setTimeout(() => (t.className = "toast"), 4500);
  }
  const slugify = s => String(s || "").toLowerCase().replace(/ı/g, "i").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Updates/deletes that RLS blocks return 0 rows and no error: treat that as "permission denied".
  async function changed(promise) {
    const { data, error } = await promise; if (error) throw error;
    if (!data || !data.length) throw Object.assign(new Error("Permission denied"), { code: "42501" });
    return data;
  }

  // ----- form helpers -----
  const field = (label, name, val = "", o = {}) => `<div class="field ${o.full ? "full" : ""}"><label for="f_${name}">${label}</label><input id="f_${name}" name="${name}" type="${o.type || "text"}" value="${esc(val ?? "")}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""} ${o.req ? "required" : ""} ${o.attrs || ""}>${o.help ? `<small>${o.help}</small>` : ""}</div>`;
  const area = (label, name, val = "", o = {}) => `<div class="field ${o.full === false ? "" : "full"}"><label for="f_${name}">${label}</label><textarea id="f_${name}" name="${name}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""}>${esc(val ?? "")}</textarea>${o.help ? `<small>${o.help}</small>` : ""}</div>`;
  const select = (label, name, opts, val = "") => `<div class="field"><label for="f_${name}">${label}</label><select id="f_${name}" name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val ?? "") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
  const check = (label, name, on) => `<div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" name="${name}" ${on ? "checked" : ""}> ${label}</label></div>`;
  const pill = (on, yes, no) => `<span class="pill ${on ? "on" : "off"}">${on ? yes : no}</span>`;

  function modal(title, body, onSave, saveLabel = "Save") {
    const m = $("#modal");
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2><form id="mform" novalidate>${body}<div class="modal-foot"><button type="button" class="btn btn-ghost" id="mcancel">Cancel</button><button class="btn btn-primary" type="submit">${saveLabel}</button></div></form></div>`;
    m.classList.add("open"); MPStorage.bind(m);
    const form = $("#mform"), close = () => { m.classList.remove("open"); m.innerHTML = ""; };
    $("#mcancel").onclick = close;
    form.onsubmit = async ev => {
      ev.preventDefault();
      const btn = form.querySelector("[type=submit]"); btn.disabled = true;
      try { await onSave(new FormData(form)); await MPStorage.cleanup(m); close(); }
      catch (e) { console.error(e); toast(e.userMessage || MP.errMsg(e, true), "error"); }
      finally { btn.disabled = false; }
    };
    return form;
  }
  // Settings-style page: a panel with a form and one Save button.
  function formPanel(container, title, inner, onSave, note = "") {
    const box = document.createElement("form"); box.className = "panel"; box.noValidate = true;
    box.innerHTML = `<h2>${title}</h2>${note ? `<p class="dl-note">${note}</p>` : ""}<div class="f-grid">${inner}</div><div class="modal-foot"><button class="btn btn-primary" type="submit">Save changes</button></div>`;
    container.appendChild(box); MPStorage.bind(box);
    box.onsubmit = async ev => {
      ev.preventDefault(); const btn = box.querySelector("[type=submit]"); btn.disabled = true;
      try { await onSave(new FormData(box), box); await MPStorage.cleanup(box); toast("Saved."); }
      catch (e) { console.error(e); toast(e.userMessage || MP.errMsg(e, true), "error"); }
      finally { btn.disabled = false; }
    };
    return box;
  }
  const confirmDelete = what => confirm(`Delete ${what}? This cannot be undone.`);
  const loadCats = () => MP.q(sb.from("categories").select("*").order("sort_order").order("name"));

  // ----- Dashboard -----
  views.dashboard = async el => {
    const count = (t, f) => { let q = sb.from(t).select("id", { count: "exact", head: true }); if (f) q = f(q); return q.then(r => { if (r.error) throw r.error; return r.count; }); };
    const [d, e, c, p, cs] = await Promise.all([
      count("dramas"), count("episodes"), count("categories"), count("dramas", q => q.eq("published", true)), count("episodes", q => q.eq("status", "coming_soon"))
    ]);
    el.innerHTML = `<h1>Dashboard</h1><div class="stats">
      ${[["Total Dramas", d], ["Total Episodes", e], ["Total Categories", c], ["Published Dramas", p], ["Coming Soon Episodes", cs]].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("")}</div>
      <div class="panel"><h2>Quick start</h2><p class="desc">1. Add a category. 2. Add a drama and upload its poster. 3. Add episodes and their authorized download links. 4. Set your site URL under SEO Settings. <a href="../index.html" target="_blank" rel="noopener" style="color:var(--accent)">Open public site</a></p></div>`;
  };

  // ----- Categories -----
  views.categories = async el => {
    const cats = await loadCats();
    el.innerHTML = `<h1>Categories</h1><div class="toolbar"><button class="btn btn-primary" id="add">Add category</button></div>
      <div class="panel tbl-wrap"><table><thead><tr><th>Name</th><th>Slug</th><th>Order</th><th>In menu</th><th>On home</th><th></th></tr></thead><tbody>
      ${cats.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.slug)}</td><td>${c.sort_order}</td><td>${pill(c.show_in_nav, "Yes", "No")}</td><td>${pill(c.show_on_home, "Yes", "No")}</td>
      <td><div class="row-actions"><button class="btn btn-sm" data-edit="${c.id}">Edit</button><button class="btn btn-sm btn-danger" data-del="${c.id}">Delete</button></div></td></tr>`).join("") || `<tr><td colspan="6" class="empty">No categories yet. Add your first one.</td></tr>`}</tbody></table></div>`;
    const form = existing => {
      const c = existing || {};
      const f = modal(existing ? "Edit category" : "Add category",
        `<div class="f-grid">${field("Name", "name", c.name, { req: true })}${field("Slug", "slug", c.slug, { help: "Used in the web address. Filled in automatically." })}${field("Sort order", "sort_order", c.sort_order ?? 0, { type: "number" })}
        ${check("Show in top menu", "show_in_nav", c.show_in_nav)}${check("Show section on homepage", "show_on_home", c.show_on_home)}</div>`,
        async fd => {
          const name = fd.get("name").trim(), slug = slugify(fd.get("slug") || name);
          if (!name) bad("Name is required."); if (!slug) bad("Slug is required.");
          const rec = { name, slug, sort_order: parseInt(fd.get("sort_order"), 10) || 0, show_in_nav: fd.get("show_in_nav") === "on", show_on_home: fd.get("show_on_home") === "on" };
          if (existing) await changed(sb.from("categories").update(rec).eq("id", existing.id).select("id")); else await changed(sb.from("categories").insert(rec).select("id"));
          toast("Category saved."); show("categories");
        });
      if (!existing) { const n = f.elements.name, s = f.elements.slug; n.addEventListener("input", () => { if (!s.dataset.t) s.value = slugify(n.value); }); s.addEventListener("input", () => (s.dataset.t = "1")); }
    };
    $("#add").onclick = () => form();
    el.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.edit) form(cats.find(c => c.id === b.dataset.edit));
      if (b.dataset.del && confirmDelete("this category (its dramas will become uncategorized)")) {
        try { await changed(sb.from("categories").delete().eq("id", b.dataset.del).select("id")); toast("Category deleted."); show("categories"); } catch (e) { toast(MP.errMsg(e, true), "error"); }
      }
    };
  };

  // ----- Dramas -----
  views.dramas = async el => {
    const [list, cats] = await Promise.all([MP.q(sb.from("dramas").select("*,categories(name)").order("created_at", { ascending: false }).limit(500)), loadCats()]);
    el.innerHTML = `<h1>Dramas</h1><div class="toolbar"><button class="btn btn-primary" id="add">Add drama</button><input type="search" id="filter" placeholder="Filter by title" style="min-height:42px;padding:0 12px;border-radius:8px;background:var(--bg);border:1px solid var(--line)"></div>
      <div class="panel tbl-wrap"><table><thead><tr><th>Poster</th><th>Title</th><th>Category</th><th>Status</th><th>Featured</th><th>Published</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>`;
    const draw = t => {
      const rows = list.filter(d => d.title.toLowerCase().includes(t.toLowerCase()));
      $("#rows").innerHTML = rows.map(d => `<tr><td><img class="thumb" src="${esc(MP.safeUrl(d.poster_url) || MP.placeholder)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${MP.placeholder}'"></td><td><strong>${esc(d.title)}</strong><br><small style="color:var(--muted)">${esc(d.slug)}</small></td>
        <td>${esc(d.categories ? d.categories.name : "None")}</td><td>${esc(d.status.replace("_", " "))}</td><td>${pill(d.featured, "Yes", "No")}</td><td>${pill(d.published, "Live", "Hidden")}</td>
        <td><div class="row-actions"><button class="btn btn-sm" data-edit="${d.id}">Edit</button><button class="btn btn-sm" data-pub="${d.id}">${d.published ? "Unpublish" : "Publish"}</button><button class="btn btn-sm btn-danger" data-del="${d.id}">Delete</button></div></td></tr>`).join("") || `<tr><td colspan="7" class="empty">No dramas found. Click "Add drama".</td></tr>`;
    };
    draw(""); $("#filter").oninput = e => draw(e.target.value);

    const form = existing => {
      const d = existing || { status: "ongoing", kind: "series", published: false };
      const f = modal(existing ? "Edit drama" : "Add drama",
        `<div class="f-grid">${field("Title", "title", d.title, { req: true })}${field("Slug", "slug", d.slug, { help: "Created from the title. You can edit it." })}
        ${select("Category", "category_id", [["", "None"], ...cats.map(c => [c.id, c.name])], d.category_id)}${select("Type", "kind", [["series", "Series"], ["movie", "Movie"]], d.kind)}
        ${field("Language", "language", d.language, { ph: "Turkish" })}${field("Subtitles", "subtitle", d.subtitle, { ph: "Urdu, English..." })}
        ${select("Status", "status", [["ongoing", "Ongoing"], ["completed", "Completed"], ["coming_soon", "Coming soon"]], d.status)}${field("Release date", "release_date", d.release_date, { type: "date" })}
        ${check("Featured (homepage hero)", "featured", d.featured)}${check("Published (visible to visitors)", "published", d.published)}
        ${MPStorage.field("poster_url", "Poster", "poster", d.poster_url, "Portrait image, at least 200x200, max 2 MB.")}
        ${MPStorage.field("backdrop_url", "Backdrop (optional, for the homepage hero)", "backdrop", d.backdrop_url, "Wide image, at least 480x200, max 2 MB.")}
        ${area("Description", "description", d.description)}</div>`,
        async fd => {
          const title = fd.get("title").trim(), slug = slugify(fd.get("slug") || title);
          if (!title) bad("Title is required."); if (!slug) bad("Slug is required.");
          const rec = { title, slug, description: fd.get("description").trim() || null, poster_url: fd.get("poster_url") || null, backdrop_url: fd.get("backdrop_url") || null,
            category_id: fd.get("category_id") || null, kind: fd.get("kind"), language: fd.get("language").trim() || null, subtitle: fd.get("subtitle").trim() || null,
            status: fd.get("status"), featured: fd.get("featured") === "on", published: fd.get("published") === "on", release_date: fd.get("release_date") || null };
          if (existing) await changed(sb.from("dramas").update(rec).eq("id", existing.id).select("id")); else await changed(sb.from("dramas").insert(rec).select("id"));
          toast("Drama saved."); show("dramas");
        });
      if (!existing) { const t = f.elements.title, s = f.elements.slug; t.addEventListener("input", () => { if (!s.dataset.t) s.value = slugify(t.value); }); s.addEventListener("input", () => (s.dataset.t = "1")); }
    };
    $("#add").onclick = () => form();
    el.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      const d = list.find(x => x.id === (b.dataset.edit || b.dataset.pub || b.dataset.del));
      try {
        if (b.dataset.edit) form(d);
        else if (b.dataset.pub) { await changed(sb.from("dramas").update({ published: !d.published }).eq("id", d.id).select("id")); toast(d.published ? "Drama hidden." : "Drama published."); show("dramas"); }
        else if (b.dataset.del && confirmDelete(`"${d.title}" and all of its episodes`)) {
          await changed(sb.from("dramas").delete().eq("id", d.id).select("id"));
          await MPStorage.removeByUrl(d.poster_url); await MPStorage.removeByUrl(d.backdrop_url);
          toast("Drama deleted."); show("dramas");
        }
      } catch (e) { toast(e.userMessage || MP.errMsg(e, true), "error"); }
    };
  };

  // ----- Episodes -----
  const QUALITIES = ["180p", "360p", "480p", "720p", "1080p"];
  views.episodes = async el => {
    const dramas = await MP.q(sb.from("dramas").select("id,title").order("title"));
    if (!dramas.length) { el.innerHTML = `<h1>Episodes</h1>${MP.notice("Add a drama first, then you can add its episodes.")}`; return; }
    if (!dramas.some(d => d.id === state.dramaId)) state.dramaId = dramas[0].id;
    const eps = await MP.q(sb.from("episodes").select("*").eq("drama_id", state.dramaId).order("season_number").order("episode_number"));
    el.innerHTML = `<h1>Episodes</h1><div class="toolbar"><select id="dsel" style="min-height:42px;padding:0 12px;border-radius:8px;background:var(--bg);border:1px solid var(--line)">${dramas.map(d => `<option value="${d.id}" ${d.id === state.dramaId ? "selected" : ""}>${esc(d.title)}</option>`).join("")}</select><button class="btn btn-primary" id="add">Add episode</button></div>
      <div class="panel tbl-wrap"><table><thead><tr><th>Season</th><th>Episode</th><th>Title</th><th>Status</th><th>Published</th><th></th></tr></thead><tbody>
      ${eps.map(e => `<tr><td>${e.season_number}</td><td>${e.episode_number}</td><td>${esc(e.title || "")}</td><td>${pill(e.status === "available", "Available", "Coming soon")}</td><td>${pill(e.published, "Live", "Hidden")}</td>
      <td><div class="row-actions"><button class="btn btn-sm" data-edit="${e.id}">Edit</button><button class="btn btn-sm" data-pub="${e.id}">${e.published ? "Unpublish" : "Publish"}</button><button class="btn btn-sm btn-danger" data-del="${e.id}">Delete</button></div></td></tr>`).join("") || `<tr><td colspan="6" class="empty">No episodes for this drama yet.</td></tr>`}</tbody></table></div>`;
    $("#dsel").onchange = e => { state.dramaId = e.target.value; show("episodes"); };

    const form = async existing => {
      const dl = existing ? await MP.q(sb.from("episode_downloads").select("*").eq("episode_id", existing.id).maybeSingle()) : null;
      const nextNo = eps.length ? Math.max(...eps.map(x => x.episode_number)) + 1 : 1;
      const e = existing || { season_number: 1, episode_number: nextNo, status: "available", published: true };
      modal(existing ? "Edit episode" : "Add episode",
        `<div class="f-grid">${select("Drama", "drama_id", dramas.map(d => [d.id, d.title]), e.drama_id || state.dramaId)}
        ${field("Season number", "season_number", e.season_number, { type: "number", attrs: 'min="1"' })}${field("Episode number", "episode_number", e.episode_number, { type: "number", attrs: 'min="1"' })}
        ${field("Title (optional)", "title", e.title)}${field("Release date", "release_date", e.release_date, { type: "date" })}
        ${select("Status", "status", [["available", "Available"], ["coming_soon", "Coming soon"]], e.status)}${check("Published (visible to visitors)", "published", e.published)}
        ${MPStorage.field("thumbnail_url", "Thumbnail", "thumbnail", e.thumbnail_url, "Wide image, at least 320x180, max 2 MB.")}
        ${area("Description", "description", e.description)}
        <div class="field full"><label>Download / watch links (only for content you are authorized to distribute)</label><small>Leave a box empty to hide that quality. Links must start with https:// or http://</small></div>
        ${QUALITIES.map(q => field(q, "quality_" + q, dl ? dl["quality_" + q] : "", { type: "url", ph: "https://..." })).join("")}</div>`,
        async fd => {
          const season = parseInt(fd.get("season_number"), 10), num = parseInt(fd.get("episode_number"), 10);
          if (!(season >= 1) || !(num >= 1)) bad("Season and episode numbers must be 1 or higher.");
          const links = {};
          for (const q of QUALITIES) { const v = (fd.get("quality_" + q) || "").trim(); if (v && !MP.safeUrl(v)) bad(`The ${q} link is not valid. It must start with http:// or https://`); links["quality_" + q] = v || null; }
          const rec = { drama_id: fd.get("drama_id"), season_number: season, episode_number: num, title: fd.get("title").trim() || null, description: fd.get("description").trim() || null,
            thumbnail_url: fd.get("thumbnail_url") || null, release_date: fd.get("release_date") || null, status: fd.get("status"), published: fd.get("published") === "on" };
          const saved = existing ? await changed(sb.from("episodes").update(rec).eq("id", existing.id).select("id")) : await changed(sb.from("episodes").insert(rec).select("id"));
          await changed(sb.from("episode_downloads").upsert({ episode_id: saved[0].id, ...links }, { onConflict: "episode_id" }).select("episode_id"));
          state.dramaId = rec.drama_id; toast("Episode saved."); show("episodes");
        });
    };
    $("#add").onclick = () => form().catch(err => toast(MP.errMsg(err, true), "error"));
    el.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      const e = eps.find(x => x.id === (b.dataset.edit || b.dataset.pub || b.dataset.del));
      try {
        if (b.dataset.edit) await form(e);
        else if (b.dataset.pub) { await changed(sb.from("episodes").update({ published: !e.published }).eq("id", e.id).select("id")); toast(e.published ? "Episode hidden." : "Episode published."); show("episodes"); }
        else if (b.dataset.del && confirmDelete(`episode ${e.episode_number}`)) { await changed(sb.from("episodes").delete().eq("id", e.id).select("id")); await MPStorage.removeByUrl(e.thumbnail_url); toast("Episode deleted."); show("episodes"); }
      } catch (err) { toast(err.userMessage || MP.errMsg(err, true), "error"); }
    };
  };

  // ----- shell -----
  async function show(name) {
    if (!views[name]) name = "dashboard";
    document.querySelectorAll(".side [data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === name));
    $(".side").classList.remove("open");
    const el = $("#view"); el.onclick = null; el.innerHTML = MP.loader();
    history.replaceState(null, "", "#" + name);
    try { await views[name](el); }
    catch (e) { console.error(e); el.innerHTML = MP.notice(MP.errMsg(e, true), "error"); }
  }
  async function start() {
    if (!sb) { document.body.innerHTML = `<div class="login-box">${MP.notice("Not configured: add your Supabase URL and public key in js/config.js.", "error")}</div>`; return; }
    const user = await MPAuth.requireAdmin(); if (!user) return;
    $("#user-email").textContent = user.email;
    document.querySelector(".side").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (b) show(b.dataset.view); });
    $("#logout").onclick = MPAuth.logout;
    $("#side-toggle").onclick = () => $(".side").classList.toggle("open");
    show(location.hash.slice(1) || "dashboard");
  }
  return { views, state, start, show, toast, modal, formPanel, field, area, select, check, pill, bad, changed, slugify };
})();
