/* Muhafız Playz — admin authentication. The browser check below is only for a clean user experience;
   the REAL protection is Row Level Security in the database (see supabase_schema.sql). */
const MPAuth = (() => {
  async function currentUser() {
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.user : null;
  }
  async function isAdmin(user) {
    const { data, error } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (error) throw error;
    return !!data && data.role === "admin";
  }
  async function logout() { await sb.auth.signOut(); location.replace("login.html"); }
  function denied(user) {
    document.body.innerHTML = `<div class="login-box"><h1>Access denied</h1><p class="desc" style="margin-bottom:16px">You are signed in as ${MP.esc(user.email)}, but this account is not an administrator.</p><button class="btn btn-primary" id="out">Sign out</button></div>`;
    document.getElementById("out").onclick = logout;
  }
  // Used by the dashboard: returns the admin user, or redirects / shows "access denied" and returns null.
  async function requireAdmin() {
    try {
      const user = await currentUser();
      if (!user) { location.replace("login.html"); return null; }
      if (!(await isAdmin(user))) { denied(user); return null; }
      return user;
    } catch (e) {
      document.body.innerHTML = `<div class="login-box">${MP.notice(MP.errMsg(e, true), "error")}<p style="margin-top:14px"><a class="btn" href="login.html">Back to sign in</a></p></div>`;
      return null;
    }
  }
  async function initLogin() {
    const form = document.getElementById("login-form"), msg = document.getElementById("msg");
    if (!sb) { msg.innerHTML = MP.notice("Not configured: add your Supabase URL and public key in js/config.js.", "error"); form.querySelector("button").disabled = true; return; }
    try { const u = await currentUser(); if (u && await isAdmin(u)) return location.replace("index.html"); } catch (e) { /* ignore */ }
    form.addEventListener("submit", async ev => {
      ev.preventDefault(); msg.innerHTML = "";
      const btn = form.querySelector("button"); btn.disabled = true; btn.textContent = "Signing in...";
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
        if (error) throw error;
        if (!(await isAdmin(data.user))) { await sb.auth.signOut(); throw Object.assign(new Error("not admin"), { userMessage: "This account is not an administrator." }); }
        location.replace("index.html");
      } catch (e) {
        const m = e.userMessage || (/invalid login/i.test(e.message) ? "Wrong email or password." : /email not confirmed/i.test(e.message) ? "This email is not confirmed yet. Confirm it in Supabase > Authentication > Users." : MP.errMsg(e));
        msg.innerHTML = MP.notice(m, "error"); btn.disabled = false; btn.textContent = "Sign in";
      }
    });
  }
  if (document.getElementById("login-form")) initLogin();
  return { requireAdmin, logout, currentUser };
})();
