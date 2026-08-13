# AQUAVIORA (BOTTELS) - Cloudflare Deployment Guide

This guide details how to deploy the **AQUAVIORA** web application to **Cloudflare Pages / Workers** using **Cloudflare D1** as the serverless SQL database.

---

## Prerequisites

1. A [Cloudflare Account](https://dash.cloudflare.com/)
2. Node.js (v18+) and npm installed locally
3. Cloudflare Wrangler CLI (`npm install -g wrangler` or `npx wrangler`)

---

## Step 1: Cloudflare Login & Authentication

Log into your Cloudflare account via Wrangler CLI:

```bash
npx wrangler login
```

---

## Step 2: Initialize Cloudflare D1 Database

1. Create a new Cloudflare D1 database:

```bash
npx wrangler d1 create bottels-db
```

2. Wrangler will output database details including the `database_id`. Example output:
```text
[[d1_databases]]
binding = "DB"
database_name = "bottels-db"
database_id = "xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

3. Copy the `database_id` and update `wrangler.jsonc`:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "bottels-db",
    "database_id": "<YOUR_ACTUAL_DATABASE_ID_HERE>"
  }
]
```

---

## Step 3: Run Database Migrations (Execute Schema)

Execute the SQL schema to create tables (`users`, `warehouses`, `orders`, `enquiries`, `audit_logs`, etc.) and seed initial data:

### Local Development DB:
```bash
npx wrangler d1 execute bottels-db --local --file=./schema.sql
```

### Production Remote DB:
```bash
npm run d1:init
# Or: npx wrangler d1 execute bottels-db --remote --file=./schema.sql
```

---

## Step 4: Build Client Dashboard

Build the React client application:

```bash
npm run build
```

This compiles the React admin dashboard and outputs static assets to `public/dashboard`.

---

## Step 5: Deploy to Cloudflare

### Option A: Deploy via Wrangler CLI (Recommended)

Deploy the application (static assets + API Worker):

```bash
npx wrangler deploy
```

Or deploy static assets to Cloudflare Pages:

```bash
npm run pages:deploy
```

### Option B: Deploy via Cloudflare Dashboard (GitHub Integration)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create Application**.
2. Select **Pages** -> **Connect to Git**.
3. Select your repository `Akashsinghkumar/BOTTELS-Brand`.
4. Configure Build settings:
   - **Framework preset**: None / Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `public`
5. Under **Settings** -> **Functions** -> **D1 Database Bindings**:
   - Variable name: `DB`
   - D1 Database: `bottels-db`
6. Click **Save and Deploy**.

---

## Testing Local Cloudflare Environment

To test locally using Cloudflare Worker runtime & D1:

```bash
npx wrangler dev
```

Visit `http://localhost:8787` in your browser.

---

## Environment Variables

If you use Google Sheets integration or custom ports, set environment variables in Cloudflare:

```bash
npx wrangler secret put GOOGLE_SHEETS_ID
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```
