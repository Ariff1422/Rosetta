# FinalFare

> The price you see is never the price you pay.

AI agents navigate every travel booking site all the way to checkout and return the **true all-in price** — including taxes, platform fees, baggage charges, and fake discounts — before you waste time finding out at the payment screen.

Built for the [TinyFish $2M Pre-Accelerator Hackathon](https://www.hackerearth.com/challenges/hackathon/the-tiny-fish-hackathon-2026/).

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | shadcn/ui component pattern + Tailwind v4 |
| Web agents | TinyFish API |
| NLP parsing | OpenAI (optional) |
| Theme | next-themes (dark default) |
| Icons | lucide-react |
| Animation | framer-motion |

---

## Project structure

```
src/
  app/
    globals.css          # shadcn CSS tokens — midnight navy / electric cyan theme
    layout.tsx           # Root layout + ThemeProvider
    page.tsx             # Main page — wires Hero → Results or HowItWorks/Pricing
    api/
      search/
        route.ts         # TinyFish API route (stub + real call commented in)
  components/
    ui/
      button.tsx         # CVA button (shadcn pattern)
      badge.tsx          # CVA badge
      textarea.tsx       # Styled textarea
      theme-provider.tsx # next-themes wrapper
    sections/
      navbar.tsx         # Sticky nav with theme toggle
      hero.tsx           # NLP search box + platform pills
      results.tsx        # Agent status chips + result cards
      how-it-works.tsx   # 3-step explainer
      pricing.tsx        # 3-tier pricing cards
      footer.tsx         # Links + brand
  lib/
    utils.ts             # cn() helper
```

---

## Getting started

```bash
npm install
cp .env.local .env.local   # add your TINYFISH_API_KEY
npm run dev
```

### Supabase auth and saved history

Add these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TINYFISH_API_KEY=
OPENAI_API_KEY=
```

Setup steps:
- Create a Supabase project
- Enable Google Auth in `Authentication > Providers`
- Add `http://localhost:3000/auth/callback` as an authorized redirect URL
- Run the SQL in [supabase/search_requests.sql](/C:/Users/Ariff1422/Documents/Rosetta/supabase/search_requests.sql)

What this enables:
- Google sign-in from the navbar
- Supabase-backed search request history per user
- Saved requests visible in the hero when the user is signed in

---

## Hackathon day checklist

### Before you `git init`
- [ ] UI is complete and looks good with mock data
- [ ] `.env.local` template is ready

### At start time
```bash
git init
git add .
git commit -m "init: FinalFare UI shell"
```

### Wiring TinyFish (first priority)
1. Add `TINYFISH_API_KEY` to `.env.local`
2. In `src/app/api/search/route.ts`:
   - Delete the `STUB_RESULTS` block
   - Uncomment the real call section
   - Adjust the `goal` prompt to match what TinyFish returns well
3. In `src/components/sections/results.tsx`:
   - Replace `MOCK_AGENTS` and `MOCK_RESULTS` with real API response
   - Call `fetch('/api/search', { method: 'POST', body: JSON.stringify({ query }) })`

### Wiring OpenAI (second priority)
Parse the NLP query into structured params so TinyFish goals are more precise:
```ts
// Example: "SG to Bangkok mid April 2 pax" →
// { origin: "Singapore", dest: "Bangkok", depart: "2026-04-18", return: "2026-04-23", pax: 2 }
```

### Demo video checklist (required for submission)
- [ ] Show typing a natural language query
- [ ] Show agent chips animating in real-time as each platform completes
- [ ] Show results appear ranked by true price
- [ ] Highlight one card with a hidden fee flag
- [ ] Highlight one card with a fake discount flag
- [ ] Show the price delta between "from S$79" and "true total S$274"

### Submission
- [ ] Post 2–3 min demo on X tagging @Tiny_Fish
- [ ] Submit on HackerEarth with GitHub repo link
- [ ] README has clear setup instructions

---

## Why this wins

The test TinyFish uses to filter submissions: *"If your app can be built without a web agent navigating real websites, it's not a fit."*

FinalFare **cannot** be built without TinyFish. Final checkout prices on Skyscanner, Google Flights, and Expedia are:
- Behind dynamic JavaScript rendering
- Only visible after entering passenger details and location
- Different for logged-in vs guest users
- Not available via any public API

TinyFish is the only infrastructure that navigates all the way to the checkout summary and returns the real number.
