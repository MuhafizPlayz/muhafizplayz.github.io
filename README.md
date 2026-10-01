# Muhafız Playz — complete setup guide (for beginners)

A static website (HTML, CSS, JavaScript) hosted **free on GitHub Pages**, with **Supabase** for login, database and image storage. No Node.js, no build step.

> **Legal note:** use this site only for content you own, created, licensed, or have permission to distribute. Only add download links you are authorized to share.

## What is in this folder

```
/                      index.html, 404.html, robots.txt, sitemap.xml, ads.txt, .nojekyll
  supabase_schema.sql  <- run this in Supabase (creates everything)
  sample-data.sql      <- OPTIONAL demo records (no real content, no links)
/css                   style.css, responsive.css, admin.css
/js                    config.js  supabase.js  app.js  seo.js  index.js  drama.js  episode.js
                       search.js  categories.js  auth.js  admin.js  settings.js  storage.js
/admin                 index.html (dashboard), login.html
/pages                 drama, episode, category, search, about, contact, privacy, terms, dmca
/assets                logo/ (your logo), posters/ (placeholder), icons/
```

## Security in one minute (please read)

- `js/config.js` may contain ONLY the **Project URL** and the **publishable / anon public key**. Everyone can see them. That is normal and safe *because* the database has Row Level Security (RLS).
- **NEVER** paste a `service_role` or `secret` key anywhere in this project.
- Being logged in is **not enough** to be an admin. Only users whose row in the `profiles` table has `role = 'admin'` can change data. The database enforces this, not just the web page.
- Visitors can only read **published** content. They cannot insert, update or delete anything.

---

## STEP 1 — Create a GitHub repository
1. Create a free account at github.com and sign in.
2. Click **+** (top right) → **New repository**.
3. Name it, for example `muhafiz-playz`. Choose **Public** (required for free GitHub Pages). Click **Create repository**.

## STEP 2 — Upload files
1. Unzip the project on your computer.
2. In your repository click **Add file → Upload files**.
3. Open the unzipped folder and drag **everything inside it** (not the folder itself): `index.html`, `404.html`, `robots.txt`, `sitemap.xml`, `ads.txt`, `.nojekyll`, `README.md`, the SQL files, and the folders `css`, `js`, `admin`, `pages`, `assets`. (Dragging folders keeps their structure. If `.nojekyll` is hidden on your computer, create it on GitHub with **Add file → Create new file**, name `.nojekyll`, leave it empty.)
4. Scroll down and click **Commit changes**.
5. `index.html` must be at the top level of the repository.

## STEP 3 — Enable GitHub Pages
1. Repository → **Settings → Pages**.
2. Under **Build and deployment**, Source: **Deploy from a branch**. Branch: **main**, folder **/ (root)**. Click **Save**.
3. Wait 1–3 minutes. Your site address will be `https://YOUR-USERNAME.github.io/muhafiz-playz/`.

## STEP 4 — Create a Supabase project
1. Go to supabase.com → sign up (free) → **New project**.
2. Choose a name, a strong database password (save it somewhere safe), and the region closest to your visitors. Click **Create new project** and wait until it is ready.

## STEP 5 — Create the database
You do not click anything special: the next step creates all tables for you.

## STEP 6 — Run the SQL
1. In Supabase open **SQL Editor → New query**.
2. Open `supabase_schema.sql` from this project, copy **all** of it, paste it, click **Run**. You should see "Success".
3. (Optional) To see demo records, run `sample-data.sql` the same way. Delete the demo records before launch.

This creates the tables `profiles, site_settings, social_links, contact_settings, categories, dramas, episodes, episode_downloads, advertisements`, the security rules (RLS), and the storage bucket `site-assets`.

## STEP 7 — Create your admin account
1. **Authentication → Users → Add user → Create new user**.
2. Enter your email and a strong password. Tick **Auto Confirm User**. Click **Create user**.
3. **Turn off public sign-ups:** **Authentication → Sign In / Providers** (or **Settings**) → turn **off** "Allow new users to sign up". This site has no registration page, and this switch closes the door completely.

## STEP 8 — Set the admin role
In **SQL Editor** run (use your real email):
```sql
update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL_HERE';
```
Check with `select email, role from public.profiles;` — your row must say `admin`.

## STEP 9 — Configure the Supabase URL
1. Supabase → **Project Settings → API** (or **API Keys**).
2. Copy the **Project URL** (looks like `https://abcdxyz.supabase.co`).
3. On GitHub open `js/config.js` → pencil icon (Edit) → replace `PASTE_YOUR_SUPABASE_URL_HERE` with it (keep the quotes).

## STEP 10 — Configure the public / publishable key
1. On the same Supabase page copy the **publishable** key (older projects call it **anon public**).
2. In `js/config.js` replace `PASTE_YOUR_PUBLIC_KEY_HERE` with it. Do **not** use `service_role` / `secret`.
3. Click **Commit changes**. Wait about a minute for GitHub Pages to update.

## STEP 11 — Storage
Already done by the SQL: a public bucket called `site-assets` (max 2 MB, images only). Only admins can upload or delete; everyone can view. Check under **Storage**; you should see `site-assets`.

## STEP 12 — Check RLS (Row Level Security)
**Authentication → Policies** (or **Table Editor**): every table should show RLS **enabled**. Quick test: open your site while logged out; you can see published content but cannot change anything.

## STEP 13 — Open the website
Go to `https://YOUR-USERNAME.github.io/muhafiz-playz/`. An empty database shows "Nothing here yet". That is correct.

## STEP 14 — Open the admin panel
Go to `.../muhafiz-playz/admin/` and sign in. A non-admin account sees "Access denied".

## STEP 15 — Add a category
**Categories → Add category.** Examples: *Turkish Dramas*, *Urdu Subtitles*, *Movies*. Tick **Show in top menu** for menu items and **Show section on homepage** for homepage rows.

## STEP 16 — Add a drama
**Dramas → Add drama.** Fill the title (the slug is created for you), category, language, subtitles, status, release date and description. Tick **Published** when ready and **Featured** to show it in the homepage hero.

## STEP 17 — Upload a poster
In the drama form click **Choose file** under Poster. A preview appears, then it uploads. Allowed: JPG, PNG, WebP; max 2 MB; at least 200x200 pixels. Click **Save**. To change it later, edit the drama and choose a new file (the old file is deleted).

## STEP 18 — Add an episode
**Episodes →** pick the drama → **Add episode.** Set season and episode number. Status **Coming soon** shows "Episode N — Coming Soon" and no link. Status **Available** makes it clickable.

## STEP 19 — Add authorized download URLs
In the episode form fill only the qualities you have (180p … 1080p). Links must start with `https://`. Empty qualities are hidden; if none are filled visitors see "Download link not available". Only add links you are allowed to distribute. Remember: anyone who opens the page can see these links.

## STEP 20 — Social links and contact
**Social Links:** paste your full profile URLs (empty = hidden). **Contact Settings:** WhatsApp number with country code, digits only (e.g. `923001234567`); the button becomes `https://wa.me/923001234567`. Add an email and Telegram link if you want.

## STEP 21 — Website settings
**Website Settings:** site name, tagline, logo, favicon. Without a custom logo the included Muhafız Playz logo is used.

## STEP 22 — Configure SEO
**SEO Settings:** set **Site URL** to your real address ending with `/` (e.g. `https://YOUR-USERNAME.github.io/muhafiz-playz/`), plus title, description and a default social image. Also edit `robots.txt` (Sitemap line) on GitHub.

## STEP 23 — Submit the sitemap to Google Search Console
1. Go to search.google.com/search-console → **Add property**. Use the **URL prefix** type with your Site URL. Verify ownership (HTML tag method: add the meta tag it gives you to `index.html` inside `<head>`).
2. In Admin → SEO Settings click **Generate sitemap.xml**, then **Download**. Upload it to the repository root, replacing `sitemap.xml`.
3. Search Console → **Sitemaps** → enter `sitemap.xml` → Submit.
4. Bing: webmaster.bing.com → add your site (you can import from Google Search Console) → submit the same sitemap.

**Honest limits of a static site:** pages are built in the visitor's browser with JavaScript. Google can render JavaScript, but indexing and ranking are never guaranteed and can take weeks. `robots.txt` and `ads.txt` are only read at the **root of a domain** (a custom domain, or a repository named `YOUR-USERNAME.github.io`), not inside `github.io/repo-name/`. A custom domain is strongly recommended for SEO and ads.

## STEP 24 — Prepare legitimate advertising
1. Apply to an ad network (for example Google AdSense) with your real site. They review it first; you need original content, working Privacy/Terms pages and a real contact.
2. After approval paste their code into **Advertisements** for the slot you want and tick **Enabled**. Do nothing until you are approved.
3. Put the network's `ads.txt` line in `ads.txt` (must be at your domain root).
4. Do not use deceptive ads, fake download buttons, or forced clicks. The site works normally with ads off.

## STEP 25 — Test everything
See the checklist below.

---

## Custom domain (optional, later)
1. Buy a domain. Repository **Settings → Pages → Custom domain** → enter it (e.g. `www.example.com`) → Save.
2. At your domain provider add a **CNAME** record: host `www`, value `YOUR-USERNAME.github.io`. (For a bare domain add four `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.)
3. GitHub creates a `CNAME` file in the repository. When the DNS check passes tick **Enforce HTTPS**.
4. Update **Site URL** in Admin → SEO Settings, `robots.txt`, and regenerate the sitemap.

All file paths are relative, so the site works at `github.io/repo-name/` and on a custom domain without edits.

## Testing checklist
- [ ] Home page opens, header/footer show, logo appears, no horizontal scrolling on a phone.
- [ ] Logged out: published dramas appear; unpublished ones do not.
- [ ] `/admin/` logged out redirects to the sign-in page. A non-admin user sees "Access denied".
- [ ] Admin: add, edit, publish/unpublish, delete a category, drama and episode.
- [ ] Poster upload shows a preview; a wrong file type or a file over 2 MB shows a clear message.
- [ ] Episode with only a 360p link shows only 360p; with none shows "Download link not available".
- [ ] "Coming soon" episode is not clickable.
- [ ] Social links and WhatsApp button work; changing the logo updates the public site.
- [ ] View source/DevTools: page title, description, canonical and Open Graph tags change per drama/episode.
- [ ] Privacy, Terms, DMCA and Contact open from the footer.
- [ ] Security test: in the browser console, while logged out, `sb.from('dramas').insert({title:'x',slug:'x'})` must return a permission error.

## Troubleshooting
| Problem | Fix |
|---|---|
| "Not connected to its database" | `js/config.js` still has placeholders, or a typo. Re-paste URL and key, commit, wait 1–2 min, hard refresh. |
| Site shows old version | GitHub Pages cache. Wait a minute, press Ctrl+F5. |
| 404 on every page | `index.html` is not at the repository root, or Pages is not enabled (Step 3). |
| Login says "wrong email or password" | Re-check the account in Authentication → Users; reset the password there. |
| "Access denied" after login | Run the Step 8 SQL with the exact same email. |
| "Permission denied" when saving | You are not admin, or the schema SQL was not fully run. Re-run `supabase_schema.sql` (safe to re-run). |
| Image upload fails | Check type (JPG/PNG/WebP), size ≤ 2 MB, and that the `site-assets` bucket exists. |
| Empty homepage | Dramas must be **Published**. Episodes must be Published and their drama Published. |
| Duplicate error | The slug, or the same season+episode number, already exists. |
| Sitemap/robots ignored | They only work at a domain root (see Step 23 limits). |

## Support
Everything is plain HTML/CSS/JS, so you can open any file on GitHub and edit it. Keep a copy of your Supabase project URL and never share your database password or any secret key.
