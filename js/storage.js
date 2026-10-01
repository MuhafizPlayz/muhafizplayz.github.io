/* Muhafız Playz — image upload to Supabase Storage (bucket "site-assets"), with validation and previews. */
const MPStorage = (() => {
  const BUCKET = "site-assets", MAX_BYTES = 2 * 1024 * 1024;
  const RULES = {
    poster:    { types: ["image/jpeg", "image/png", "image/webp"], minW: 200, minH: 200, max: 5000, cls: "", name: "poster" },
    backdrop:  { types: ["image/jpeg", "image/png", "image/webp"], minW: 480, minH: 200, max: 6000, cls: "wide", name: "wide image" },
    thumbnail: { types: ["image/jpeg", "image/png", "image/webp"], minW: 320, minH: 180, max: 6000, cls: "wide", name: "thumbnail" },
    logo:      { types: ["image/jpeg", "image/png", "image/webp", "image/gif"], minW: 32, minH: 32, max: 4000, cls: "logo", name: "logo" },
    favicon:   { types: ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/webp"], minW: 16, minH: 16, max: 1024, cls: "logo", name: "favicon" },
    social:    { types: ["image/jpeg", "image/png", "image/webp"], minW: 600, minH: 315, max: 6000, cls: "wide", name: "social image" }
  };
  const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico" };

  function dims(file) {
    return new Promise(res => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { res({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(u); };
      im.onerror = () => { res(null); URL.revokeObjectURL(u); };
      im.src = u;
    });
  }
  async function validate(file, kind) {
    const r = RULES[kind]; if (!r) return "Unknown image type.";
    if (!r.types.includes(file.type)) return `Wrong file type. Use ${r.types.map(t => t.split("/")[1].replace("x-icon", "ico").replace("vnd.microsoft.icon", "ico")).join(", ").toUpperCase()}.`;
    if (file.size > MAX_BYTES) return `This file is ${(file.size / 1048576).toFixed(1)} MB. The maximum is 2 MB.`;
    const d = await dims(file);
    if (d) {
      if (d.w < r.minW || d.h < r.minH) return `Image is too small (${d.w}x${d.h}). Minimum for a ${r.name} is ${r.minW}x${r.minH}.`;
      if (d.w > r.max || d.h > r.max) return `Image is too large (${d.w}x${d.h}). Maximum is ${r.max}x${r.max}.`;
    } else if (!/icon/.test(file.type)) return "This file could not be read as an image.";
    return "";
  }
  async function upload(file, kind) {
    const err = await validate(file, kind); if (err) throw Object.assign(new Error(err), { userMessage: err });
    const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[file.type] || "png"}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
    if (error) throw Object.assign(error, { userMessage: /row-level|permission|unauthorized/i.test(error.message) ? "Upload blocked: you must be signed in as an administrator." : /exceeded|size/i.test(error.message) ? "The file is too large for storage (max 2 MB)." : "Image upload failed. Please try again." });
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  async function removeByUrl(url) {
    const m = String(url || "").match(/\/storage\/v1\/object\/public\/site-assets\/(.+)$/);
    if (!m) return;
    try { await sb.storage.from(BUCKET).remove([decodeURIComponent(m[1])]); } catch (e) { console.warn("Old image not removed", e); }
  }
  // HTML for an image field (hidden input carries the public URL).
  function field(name, label, kind, url = "", help = "") {
    const r = RULES[kind], accept = r.types.join(",");
    return `<div class="field full" data-img-field="${name}" data-kind="${kind}" data-orig="${MP.esc(url || "")}">
      <label>${label}</label>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <img class="preview ${r.cls}" data-prev src="${MP.esc(MP.safeUrl(url) || MP.placeholder)}" alt="Preview">
        <div style="display:grid;gap:6px"><input type="file" accept="${accept}" data-file>
          <small data-status>${help || "Max 2 MB. Choose an image from your device."}</small>
          <button type="button" class="btn btn-sm btn-ghost" data-clear style="justify-self:start">Remove image</button></div>
      </div><input type="hidden" name="${name}" value="${MP.esc(url || "")}"></div>`;
  }
  function bind(rootEl) {
    rootEl.querySelectorAll("[data-img-field]").forEach(box => {
      if (box.dataset.bound) return; box.dataset.bound = "1";
      const file = box.querySelector("[data-file]"), prev = box.querySelector("[data-prev]"), st = box.querySelector("[data-status]"), hid = box.querySelector('input[type=hidden]');
      file.addEventListener("change", async () => {
        const f = file.files[0]; if (!f) return;
        const kind = box.dataset.kind, err = await validate(f, kind);
        if (err) { st.textContent = err; st.style.color = "var(--danger)"; file.value = ""; return; }
        prev.src = URL.createObjectURL(f); st.style.color = ""; st.textContent = "Uploading...";
        file.disabled = true;
        try { const url = await upload(f, kind); hid.value = url; prev.src = url; st.textContent = "Uploaded. Click Save to keep this change."; st.style.color = "var(--ok)"; }
        catch (e) { prev.src = MP.safeUrl(hid.value) || MP.placeholder; st.textContent = e.userMessage || MP.errMsg(e); st.style.color = "var(--danger)"; }
        finally { file.disabled = false; file.value = ""; }
      });
      box.querySelector("[data-clear]").addEventListener("click", () => { hid.value = ""; prev.src = MP.placeholder; st.style.color = ""; st.textContent = "Image removed. Click Save to confirm."; });
    });
  }
  // After a successful save: delete the previous file if it was replaced or removed.
  async function cleanup(rootEl) {
    for (const box of rootEl.querySelectorAll("[data-img-field]")) {
      const orig = box.dataset.orig, cur = box.querySelector('input[type=hidden]').value;
      if (orig && orig !== cur) await removeByUrl(orig);
      box.dataset.orig = cur;
    }
  }
  return { field, bind, cleanup, upload, validate, removeByUrl };
})();
