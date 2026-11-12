# GoatLeads CRM

Multi-currency B2B CRM & Revenue Pipeline platform built with **Next.js 16** (App Router, Tailwind CSS 4, Zustand) and **Express 5 + MongoDB**.

## Features
- **Auth & RBAC**: JWT authentication with `admin` and `rep` roles, plus automatic first-admin bootstrap (`ADMIN_EMAIL`).
- **Multi-Currency Leads & CSV Engine**: Leads across India (`INR`), USA (`USD`), UK (`GBP`), Canada (`CAD`), and UAE (`AED`) normalized to USD (`amountBase`) via cached/live exchange rates, with CSV import & filtered export.
- **8-Stage Kanban Pipeline**: Drag-and-drop stage progression with mandatory `Closed Lost` reasons.
- **Lead Detail (`/leads/[id]`)**: Interactive stage stepper, **Activity Timeline & Notes** (notes, calls, emails, meetings, and automatic audit trail), follow-up tasks, and **Deal Health & Copilot** follow-up generator.
- **Executive Dashboard**: Pipeline KPIs, stage & country breakdowns, Lost Deal Reasons post-mortem, sales rep leaderboard & filter, and live currency switching.
- **Productivity & Notifications**: Follow-up task queue with 15-min email reminders (`node-cron`), in-app notifications bell, `Ctrl+K` Command Palette, Multi-Country World Clock, and Profile & Settings (`/settings`).

---

## Local Development

### 1. Backend (`server/`)
```bash
cd server
npm install
# Configure server/.env (see server/.env.example)
npm run seed   # Optional: populate demo admin, reps, leads, tasks, and activities
npm run dev
```

### 2. Frontend (`client/`)
```bash
cd client
npm install
# Configure client/.env.local (NEXT_PUBLIC_API_URL=http://localhost:5000/api)
npm run dev
```

### 3. Verify APIs & Lint
```bash
cd server && npm test
cd client && npm run lint
```

---

## Going Live (Production Deployment)

### Step 1: Database (MongoDB Atlas)
1. Create a free/production cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Whitelist your backend host IPs (or `0.0.0.0/0` for dynamic cloud IPs) and copy your `mongodb+srv://...` connection string.

### Step 2: Backend (`server/` on Render, Railway, or Fly.io)
1. Set **Root Directory** to `server`.
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. Set environment variables (refer to [server/.env.example](server/.env.example)):
   - `NODE_ENV=production`
   - `MONGO_URI=<your-atlas-uri>`
   - `CLIENT_URL=https://your-app.vercel.app`
   - `JWT_SECRET=<strong-random-hex-secret>`
   - `ADMIN_EMAIL=<your-admin-email>`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (required in production for invites and task reminder emails)
   - Optional: `EXCHANGE_RATE_API_KEY`, `GEMINI_API_KEY`
5. Confirm health check at `https://your-backend-url/api/health`.

### Step 3: Frontend (`client/` on Vercel)
1. Import the repo on [Vercel](https://vercel.com/) and set **Root Directory** to `client`.
2. Set environment variables (refer to [client/.env.example](client/.env.example)):
   - `NEXT_PUBLIC_API_URL=https://your-backend-url/api`
   - `NEXT_PUBLIC_SHOW_DEMO=false`
3. Deploy — Vercel will run `npm run build` automatically.
4. Once deployed, verify `CLIENT_URL` on the backend exactly matches your live Vercel domain (no trailing slash).

