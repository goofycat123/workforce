# Workforce — Team Management System

Clock in/out · Sales tracking · Earnings · Early payouts · Leaderboard

## Stack
- **Frontend**: React + Vite → Vercel (free)
- **Backend / DB / Auth**: Supabase (free tier)

---

## Step 1 — Supabase setup

1. Go to https://supabase.com and create a free account
2. Click "New project" — name it `workforce`, set a DB password, pick a region close to you
3. Once it loads, go to **SQL Editor** and paste the entire contents of `supabase/schema.sql` and click Run
4. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

---

## Step 2 — Local setup

```bash
# Clone / unzip the project folder
cd workforce

# Copy env file and fill in your Supabase values
cp .env.example .env
# Edit .env:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...

# Install dependencies
npm install

# Run locally
npm run dev
# → opens at http://localhost:5173
```

---

## Step 3 — Create your owner account

1. Go to your Supabase project → **Authentication → Users → Add user**
2. Enter your email + password
3. Go to **Table Editor → profiles** and find your new user row
4. Change the `role` column from `chatter` to `owner`
5. Sign in at `http://localhost:5173/login`

---

## Step 4 — Deploy to Vercel (free, public URL)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: workforce
# - Root directory: ./
# - Build command: npm run build
# - Output directory: dist

# Add environment variables when prompted:
# VITE_SUPABASE_URL = your URL
# VITE_SUPABASE_ANON_KEY = your anon key
```

Your site will be live at `https://workforce-xxx.vercel.app`

For a custom domain (optional, also free on Vercel): go to Vercel dashboard → your project → Domains.

---

## Step 5 — Add employees

1. Sign in as owner → go to **Admin → Employees → Add employee**
2. Enter their name, email, temporary password, role = `chatter`
3. They sign in at your Vercel URL with those credentials
4. They can change their password in Supabase Auth settings later

---

## How it works

### For chatters
- **Shifts** → Clock in when starting work, clock out when done
- **Sales** → Log net sales after each session → earnings calculated automatically at 7%
- **Payouts** → Request 10%, 20%, or 30% of their earned pay early
- **Leaderboard** → See where they rank vs teammates
- **Profile** → Full earnings history across all periods

### For you (owner)
- **Dashboard** → See all active shifts, pending payout requests, approve/deny with one click
- **Admin → Periods** → Create and close pay periods
- **Admin → Earnings** → Edit bonuses, penalties, advances per employee — net owed auto-calculates
- **Admin → Employees** → Add new staff, see all accounts

---

## Pay period workflow

1. Go to Admin → Periods → Create new period (e.g. "March 16–27", start/end dates)
2. Employees clock in/out and log sales throughout the period
3. At end of period: Admin → Earnings → add any bonuses/penalties/advances
4. Close the period → final net owed is locked per employee
5. Pay everyone, start a new period

---

## Supabase free tier limits
- 500MB database storage
- 50,000 monthly active users
- Unlimited API requests
- More than enough for a team of 50+ chatters

## Vercel free tier limits
- Unlimited deployments
- 100GB bandwidth/month
- Custom domain support
- More than enough forever at this scale
