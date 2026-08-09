# Deploying NotSoundcloud to Cloudflare Pages

This guide walks you through deploying NotSoundcloud to Cloudflare Pages with
free hosting, automatic HTTPS, and global CDN.

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- Node.js 15.x or newer and npm/pnpm/bun installed
- Git installed (for connecting a GitHub/GitLab repo)

## How it works

NotSoundcloud is a Next.js app with API routes. Cloudflare Pages uses the
`@cloudflare/next-on-pages` adapter to compile the Next.js app into the Cloudflare
Pages format (static assets + Edge Functions for API routes).

The API routes run on Cloudflare's Edge runtime (V8 isolate). We use an
Edge-compatible client (`src/lib/soundcloud-edge.ts`) that uses `fetch`
directly. For compatibility with older Node.js versions (pre-18) which lack
native `fetch`, the client will dynamically import `node-fetch`. This means you
must install it (`npm i node-fetch@2`) if you plan to run this project on an
older Node.js version. On modern runtimes like Cloudflare's Edge or Node.js 18+, the native `fetch` is used automatically.

---

## Option A: Deploy via the Cloudflare Dashboard (recommended for beginners)

### Step 1 — Push your code to GitHub

1. Create a new repository on GitHub (e.g. `notsoundcloud`)
2. Push your local code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/notsoundcloud.git
   git push -u origin main
   ```

### Step 2 — Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select your GitHub account and authorize Cloudflare
3. Select the `notsoundcloud` repository
4. Configure the build:
   - **Framework preset**: `Next.js`
   - **Build command**: `npm install && npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
   - **Environment variables** (advanced → add):
     - `NODE_VERSION` = `20`
     - `NPM_FLAGS` = `--legacy-peer-deps`
5. Click **Save and Deploy**

> **Note**: The `.npmrc` file in the project root already sets
> `legacy-peer-deps=true`, so the `NPM_FLAGS` env var is optional but
> doesn't hurt. Cloudflare's build environment uses npm to install deps,
> and this flag prevents peer dependency conflicts between
> `@cloudflare/next-on-pages` and `wrangler`.

Cloudflare will build and deploy your app. The first build takes ~3-5 minutes.
You'll get a URL like `https://notsoundcloud.pages.dev`.

### Step 3 — Set up automatic deployments

Every time you `git push` to `main`, Cloudflare automatically rebuilds and
deploys. You can also enable **Deploy Previews** — each pull request gets its
own preview URL.

---

## Option B: Deploy via Wrangler CLI (recommended for CI/CD)

### Step 1 — Install dependencies

```bash
bun install
# or: npm install
```

### Step 2 — Build for Cloudflare Pages

```bash
bun run pages:build
# This runs: npx @cloudflare/next-on-pages
```

This creates a `.vercel/output/static` directory with the compiled app.

### Step 3 — Deploy

```bash
bun run pages:deploy
# This runs: npx @cloudflare/next-on-pages && npx wrangler pages deploy .vercel/output/static
```

The first time you run this, Wrangler will prompt you to:
1. Log in to Cloudflare (opens a browser)
2. Choose a project name (or create a new one)

After that, subsequent deploys are instant:
```bash
bun run pages:deploy
```

### Step 4 — Preview locally before deploying

```bash
bun run pages:preview
# This runs: npx @cloudflare/next-on-pages && npx wrangler pages dev .vercel/output/static
```

This starts a local server that emulates the Cloudflare Pages environment so
you can test the build before deploying.

---

## Custom domain (optional)

1. Go to your Pages project in the Cloudflare dashboard
2. **Custom domains** → **Set up a custom domain**
3. Enter your domain (e.g. `notsoundcloud.example.com`)
4. Cloudflare will guide you through adding a CNAME record
5. SSL is automatic and free

---

## Configuration files

### `wrangler.toml`
Already created in the project root:
```toml
name = "notsoundcloud"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"

[build]
command = "npx @cloudflare/next-on-pages"
```

### `next.config.ts`
The `output: "standalone"` was removed — Cloudflare Pages uses the default
Next.js output, and `@cloudflare/next-on-pages` handles the conversion.

---

## Troubleshooting

### Build fails with "Could not discover SoundCloud client_id"
The SoundCloud client_id is auto-discovered by scraping soundcloud.com. If
SoundCloud changes their page structure, this can break. The client_id is
cached in memory after the first successful discovery, so only the first
request after a cold start is affected. If it persists, the regex in
`src/lib/soundcloud-edge.ts` may need updating.

### API routes return 404
Make sure the build command is `npx @cloudflare/next-on-pages` (not `next
build`). The standard Next.js build doesn't create Edge-compatible functions.

### Audio playback doesn't work
SoundCloud's CDN (`cf-media.sndcdn.com`) returns signed URLs that expire.
The `/api/stream/[id]` route 302-redirects to these signed URLs. Cloudflare
Pages Edge Functions handle redirects correctly, so this should work
out of the box.

### IndexedDB / localStorage not persisting
Cloudflare Pages serves over HTTPS, so both IndexedDB and localStorage work
normally. The backup/restore feature (Settings → Backup & restore) lets
users download their data as a file for extra safety.

---

## Free tier limits

Cloudflare Pages free tier includes:
- **500 builds per month** (more than enough for most projects)
- **Unlimited requests** to deployed sites
- **Unlimited bandwidth**
- **20,000 Edge function invocations per day** (each API call counts as one)
- The `/api/stream/[id]` route does a 302 redirect (1 invocation), so 20K
  plays/day is the limit. For most personal use this is plenty.

If you hit the limit, consider upgrading to Cloudflare Workers Paid ($5/month)
for 10M requests/month.
