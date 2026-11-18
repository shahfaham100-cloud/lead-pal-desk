# Workwear Ops on Hostinger Node.js

## Backend requirement — read first

This packages the website and secure server code, not the database, orders or uploaded files. **Lovable Cloud's private server key is not exportable.** This app needs a private server key for order reads/writes and signed file links, so its current Cloud settings cannot simply be copied to Hostinger.

For independent deployment, arrange a separately managed compatible backend with its own URL, publishable key and private service-role key. Migrate the database schema/data and private `order-files` bucket contents first. Preserve order IDs, file paths and the order-number sequence. Files in `drizzle/migrations` are migration history, not a guaranteed complete backend export. Do not make orders publicly accessible to bypass missing credentials. Backend migration is not included in this packaging change.

## 1. Build locally

Download the GitHub ZIP, extract it, and open a terminal in the folder containing `package.json`. Use **Node.js 22 LTS, version 22.12 or later**.

For your own backend, create `.env.local` containing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These public browser values are baked into the build and must match the server's backend. Without overrides the repository's `.env` still points the browser to the current Cloud backend. Never use a `VITE_` variable for a private key.

```sh
npm install
npm run build:hostinger
```

Result:

```text
hostinger-upload/
  package.json
  package-lock.json
  server.js
  HOSTINGER.md
  settings.example
  output/
    server/index.mjs
    server/...bundled server chunks
    public/...browser assets
```

The folder excludes source files, Git metadata, local dependencies, credentials and source maps. `npm run build` remains the normal Lovable build; `build:hostinger` is separate. Do not commit generated `hostinger-upload` files to your source repository.

## 2. ZIP and upload

Open `hostinger-upload`, select **its contents**, and ZIP them. `package.json` and `server.js` must be at the ZIP root, not under an extra parent folder. Include all of `output`. `settings.example` has blank values and is optional.

In hPanel: **Websites → Add Website → Node.js web app → Upload your files**. Use a plan with managed Node.js support (Business or Cloud hosting), not static/PHP hosting.

| Setting | Value |
| --- | --- |
| Framework / application type | **Other** — not React / Vite static hosting |
| Node.js | **22** |
| Package manager | **npm** |
| Root directory | ZIP root (`/` or empty) |
| Build script | `build` / `npm run build` if required; otherwise empty |
| Output directory | Empty — Other uses the root when an entry file is set |
| Entry file | **server.js** |
| Start command, if shown | `npm start` |

The uploaded package is already built; its `build` script only checks the compiled entry exists. Do not run `build:hostinger` on this uploaded package. The server binds to `0.0.0.0` and uses Hostinger's `PORT`. Do not set a fixed port or edit Hostinger's generated `.htaccess`.

## 3. Set runtime values

Enter these in Hostinger **Environment variables**, not your ZIP:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Your separately managed backend URL |
| `SUPABASE_PUBLISHABLE_KEY` | Its publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Its private server key — unavailable from Lovable Cloud |
| `SESSION_SECRET` | Random secret, at least 32 characters |
| `SALES_PASSCODE` | Shared Sales Agent passcode |
| `VENDOR_PASSCODE` | Shared Vendor passcode |
| `ADMIN_PASSCODE` | Shared Admin passcode |
| `NODE_ENV` | `production` |

Server URL/key must match the public values used for the local build. Generate a session secret locally using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`; copy it only to Hostinger's protected settings. Saving environment changes redeploys the app. Use HTTPS because production sign-in cookies require it. Roles must sign in again on the new domain.

## 4. Check before switching traffic

Verify each role's sign-in, existing order loading, intended order changes, product images, mockup upload/download, direct-link refresh, and Sales Agent/Vendor restrictions. Use the migrated backend, not empty demo data. Hostinger deployment itself has not been verified here.

If startup fails, check Runtime Logs: missing settings appear by name only. Missing `output/server/index.mjs` means the ZIP layout or build is wrong. If sign-in works but orders fail, check credentials and migrated schema. If browser uploads fail, check matching browser/server backend settings and the private `order-files` bucket.

## Official references checked

- [Node.js app and ZIP upload](https://docs.hostinger.com/node.js/creating-an-app)
- [Build settings and entry files](https://docs.hostinger.com/node.js/build-settings)
- [Environment variables](https://docs.hostinger.com/node.js/environment-variables)