# PortIntermodal Site

Marketing website for [PortIntermodal](https://portintermodal.com), an intermodal transportation management platform in development. Plain static HTML, CSS, and JS, structured like `difffind-site`. Hosted on GitHub Pages.

This repository contains **only the marketing site**. The TMS application (Java 21, Spring Boot, React, PostgreSQL) lives in a separate repository and will be served from `app.portintermodal.com`. There is no backend, database, or authentication here.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000 (set PORT to change)
npm run build   # minified site in dist/
npm test        # build + check titles, descriptions, canonicals, JSON-LD, sitemap
```

## Pages

`index.html`, `platform/`, `features/`, `progress/`, `roadmap/`, `demo/`, `contact/`. Shared styles in `styles.css`, shared behavior in `script.js`. Each page repeats the header and footer (as in `difffind-site`), so a nav change means editing every page. Adding a page also means adding it to `build.mjs`, `server.mjs`, `test.mjs`, and `sitemap.xml`.

## Updating content

Edit the HTML directly. Only record things that actually happened.

- **Development update:** `progress/index.html`. Add an `<article class="card update">` at the top of "Recent development updates", move milestones between lists by changing the `<li>` class (`complete`, `progress`, `upcoming`), update "Last updated", and bump `<lastmod>` in `sitemap.xml`. A comment at the top of the page lists the steps.
- **Feature status:** `features/index.html` and the homepage card list. Use the badge classes `planned`, `dev`, `demo`. Never mark a feature "Available for Demo" unless it can be shown.
- **Roadmap dates:** `roadmap/index.html`. Add a date only when one has been agreed.
- **Demonstrations:** `demo/index.html`. Put images in `assets/`, add cards to the matching group and delete that group's "empty" line. The prototype is invitation-only, so the page links to the contact form for invites.

## Contact form

The site itself is static (GitHub Pages), so the form posts JSON to `email-api/`, a zero-dependency Node service on Fly.io (`portintermodal-email`) that validates, rate limits (5/hour per IP, 100/day total), drops honeypot hits, and emails `contact@portintermodal.com` through Resend. The endpoint is `SITE_CONFIG.formEndpoint` in `script.js`.

**One-time setup**

1. **Resend:** create an account, add the domain `portintermodal.com` under *Domains*, and create the DNS records it shows at Namecheap (*Advanced DNS*). They do not conflict with the Google MX records. Wait until the domain shows *Verified*, then create an API key.
2. **Fly app and secret** (run from `email-api/`; the app name is already in `email-api/fly.toml`):

```bash
cd email-api
fly apps create portintermodal-email
fly secrets set RESEND_API_KEY=re_xxx --app portintermodal-email
fly deploy
```

3. **Publish the site:** the endpoint in `script.js` is `https://portintermodal-email.fly.dev/api/contact`. Commit and push to `main` so GitHub Pages serves it.
4. **Check:** `curl https://portintermodal-email.fly.dev/healthz` returns `{"ok":true}`; then submit the form once and confirm the mail arrives at `contact@portintermodal.com`.

**Later deploys:** `cd email-api && fly deploy`. Tests run against a fake Resend server and send no mail:

```bash
node --test email-api/test.mjs
```

Until the domain is verified in Resend, mail can only be sent from `onboarding@resend.dev` to your own Resend account address. The service is named generically so other mail (for example invitations) can use it later.

Optional env vars: `CONTACT_TO`, `CONTACT_FROM` (must be on a domain verified in Resend), `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_IP_HOUR`, `RATE_LIMIT_PER_DAY`.

## Deploy (GitHub Pages)

1. Push to a GitHub repository.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Set the custom domain to `portintermodal.com` (the `CNAME` file is already included) and enable **Enforce HTTPS**.
4. Point DNS at GitHub Pages: A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a `www` CNAME to `<user>.github.io`.

Every push to `main` runs `.github/workflows/deploy.yml` (install, test, build, publish `dist/`).

## SEO

Per-page title, description, canonical, Open Graph and Twitter tags, JSON-LD (Organization, WebSite, SoftwareApplication, WebPage, BreadcrumbList), `sitemap.xml`, and `robots.txt`. No social preview image is set yet; add one in `assets/` and an `og:image` tag when available.

PortIntermodal is independent and not affiliated with PortPro or any other vendor.
