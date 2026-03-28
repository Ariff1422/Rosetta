# FinalFare — Claude Code Handoff Document

> Full context for continuing this project in Claude Code.
> This document covers what has been built, the design decisions made, what still needs to be done, and the exact skills/tools needed.

---

## 1. Project Overview

**FinalFare** is a Next.js web app that takes a natural language travel query from the user, spawns parallel TinyFish AI web agents to navigate booking sites all the way to their checkout screens, and returns the **true all-in price** for each platform — exposing hidden fees, platform surcharges, and fake discounts.

Built for the **TinyFish $2M Pre-Accelerator Hackathon** (deadline: Mar 29, 2026).

### The core insight
Travel booking sites advertise a low "from" price but the real cost only appears at the final checkout screen — after adding taxes, platform fees, baggage charges. TinyFish web agents are the only tool that can navigate to that screen without a login, making this app impossible to replicate with a traditional scraper or public API.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, API routes, file-based routing |
| Language | TypeScript | Type safety across API boundary |
| Styling | Tailwind CSS v4 | Utility-first, pairs with shadcn |
| Components | shadcn/ui pattern (CVA + Radix) | Copy-paste, fully owned, composable |
| Theme | next-themes | Dark/light toggle, default dark |
| Icons | lucide-react | Consistent, tree-shakeable |
| Web agents | TinyFish API (`agent.tinyfish.ai`) | Core product infrastructure |
| LLM parsing | OpenAI API (optional, second priority) | Parse NLP query into structured params |
| Package manager | npm | Default |

---

## 3. What Has Been Built (UI Shell — Complete)

### File structure
```
finalfare/
├── package.json
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── .env.local               # template only — keys empty
├── .gitignore
├── README.md
└── src/
    ├── app/
    │   ├── globals.css      # ✅ Done — shadcn CSS tokens, oklch color space
    │   ├── layout.tsx       # ✅ Done — Geist font, ThemeProvider, metadata
    │   ├── page.tsx         # ✅ Done — state machine: Hero → Results
    │   └── api/
    │       └── search/
    │           └── route.ts # ✅ Stub done — real TinyFish call written but commented out
    ├── lib/
    │   └── utils.ts         # ✅ Done — cn() helper
    └── components/
        ├── ui/
        │   ├── button.tsx         # ✅ Done — CVA variants: default, outline, ghost, etc.
        │   ├── badge.tsx          # ✅ Done — CVA variants: default, success, warning, etc.
        │   ├── textarea.tsx       # ✅ Done — styled, focus ring
        │   └── theme-provider.tsx # ✅ Done — next-themes wrapper
        └── sections/
            ├── navbar.tsx         # ✅ Done — sticky, blur backdrop, theme toggle button
            ├── hero.tsx           # ✅ Done — NLP textarea, example pills, platform row, trust stats
            ├── results.tsx        # ✅ Done — agent status chips, result cards with breakdown + flags (MOCK DATA)
            ├── how-it-works.tsx   # ✅ Done — 3-step cards
            ├── pricing.tsx        # ✅ Done — 3-tier pricing (Free / Pro / Teams)
            └── footer.tsx         # ✅ Done — links, brand
```

### Design system
- **Theme**: Midnight navy dark (`oklch(0.11 0.025 255)`) / cool slate light (`oklch(0.98 0.005 240)`)
- **Primary accent**: Electric cyan (`oklch(0.72 0.22 200)` in dark, `oklch(0.62 0.22 200)` in light)
- **Default mode**: Dark
- **Font**: Geist Sans (variable `--font-sans`) + Geist Mono
- **Radius**: `0.75rem` base, scales via `--radius-sm/md/lg/xl`
- **Deliberately different from TinyFish**: TinyFish uses warm orange/brown — FinalFare uses cool cyan/navy

### Current app behaviour (with stubs)
1. User lands on Hero — NLP textarea with example pills, list of 20+ platforms, trust stats
2. User types query and clicks "Find true price"
3. `page.tsx` sets `query` state → renders `<Results query={query} />`
4. `Results` shows animated agent status chips (useEffect timers simulating async completion)
5. After ~3s, mock result cards appear — ranked by true price, with fee breakdowns and warning flags
6. Navbar has working dark/light toggle

---

## 4. What Still Needs To Be Done

### Priority 1 — Core (must have for hackathon)

#### 4.1 Wire the TinyFish API
**File**: `src/app/api/search/route.ts`

Steps:
1. Add `TINYFISH_API_KEY` to `.env.local`
2. Delete the `STUB_RESULTS` block (lines marked `── STUB ──` to `── END STUB ──`)
3. Uncomment the real call block (lines marked `── REAL CALL ──` to `── END REAL CALL ──`)
4. The real call is already written — it runs `FLIGHT_TARGETS` in parallel via `Promise.allSettled`, parses each SSE stream, and normalises the result into `PriceResult[]`

**TinyFish API shape**:
```ts
POST https://agent.tinyfish.ai/v1/automation/run-sse
Headers: { "X-API-Key": process.env.TINYFISH_API_KEY, "Content-Type": "application/json" }
Body: { url: string, goal: string, browser_profile: "lite" | "stealth" }
Response: SSE stream — listen for events where type === "COMPLETE" and extract event.result
```

**The goal prompt** (adjust based on what TinyFish returns reliably in testing):
```
Search for flights matching: "${query}".
Navigate to results, select the cheapest available option,
proceed to checkout WITHOUT purchasing, and extract as JSON:
{ base_fare, taxes_and_fees, baggage_fee, platform_service_fee,
  total_checkout_price, airline_name, flight_duration, departure_time }
Return ONLY valid JSON, no markdown.
```

**Key constraint from TinyFish docs**: Each run starts fresh with no session cookies — so stick to guest checkout flows only. Do NOT attempt to log in on behalf of the user.

#### 4.2 Wire the Results component to the real API
**File**: `src/components/sections/results.tsx`

Currently uses hardcoded `MOCK_AGENTS` and `MOCK_RESULTS`. Replace with:

```ts
// At the top of the Results component:
const [results, setResults] = useState<PriceResult[]>([]);
const [agents, setAgents] = useState<Agent[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchResults = async () => {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResults(data.results);
    setLoading(false);
  };
  fetchResults();
}, [query]);
```

For the agent chips: either drive them from SSE events streamed directly to the client (ideal for demo), or simulate based on loading state (acceptable fallback). The SSE streaming approach is more impressive for the demo video.

#### 4.3 SSE streaming to client (ideal, makes demo impressive)
Instead of a single `POST` returning JSON, stream TinyFish SSE events through to the browser so the agent chips update in real time as each platform completes.

Use Next.js Route Handler with `ReadableStream`:

```ts
// route.ts — streaming version
export async function POST(req: NextRequest) {
  const { query } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      await Promise.allSettled(
        FLIGHT_TARGETS.map(async (target) => {
          send({ type: "AGENT_START", platform: target.name });
          const result = await runTinyFishAgent(target.url, buildGoal(query));
          send({ type: "AGENT_DONE", platform: target.name, result });
        })
      );

      send({ type: "COMPLETE" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

Then in `results.tsx` consume with `EventSource` or `fetch` + `ReadableStream` reader.

---

### Priority 2 — Quality (do if time permits)

#### 4.4 OpenAI NLP parsing
Parse the free-text query into structured travel params before passing to TinyFish agents, so the goal prompt is precise.

```ts
// src/lib/parse-query.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseQuery(query: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Extract travel details from the user query. 
        Return ONLY valid JSON: 
        { origin: string, destination: string, departDate: string (YYYY-MM-DD or null), 
          returnDate: string (YYYY-MM-DD or null), pax: number, 
          types: ("flights" | "hotels" | "cars")[] }`,
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
  });
  return JSON.parse(res.choices[0].message.content!);
}
```

Install: `npm install openai`

#### 4.5 Hotels and car rentals
The current `FLIGHT_TARGETS` only covers flight platforms. Add:

```ts
const HOTEL_TARGETS = [
  { url: "https://www.booking.com",  name: "Booking.com", color: "#003580", initials: "BK" },
  { url: "https://www.agoda.com",    name: "Agoda",       color: "#5C2D91", initials: "AG" },
  { url: "https://www.hotels.com",   name: "Hotels.com",  color: "#D21034", initials: "HC" },
];

const CAR_TARGETS = [
  { url: "https://www.rentalcars.com", name: "Rentalcars", color: "#FF6600", initials: "RC" },
  { url: "https://www.kayak.com/cars", name: "Kayak Cars", color: "#FF690F", initials: "KC" },
];
```

The NLP parser (4.4) determines which target sets to activate based on `types` in the parsed query.

#### 4.6 Fake discount detection
In the TinyFish goal prompt, also ask for `original_price_set_date` — the date the "original" price was set on that platform. If it was set within the last 7 days, flag it as a potential fake discount.

```ts
if (raw.original_price_set_date) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(raw.original_price_set_date).getTime()) / 86400000
  );
  if (daysAgo < 7) {
    flags.push(`"${raw.discount_label}" — original price set ${daysAgo} days ago`);
  }
}
```

#### 4.7 Framer Motion animations
Install is already in `package.json`. Add to:
- Hero: staggered fade-in on headline, subtext, search box
- Results: each result card animates in with `initial={{ opacity: 0, y: 16 }}` as data arrives
- Agent chips: animate from grey → scanning → done

```ts
import { motion, AnimatePresence } from "framer-motion";

// Result card with entrance animation
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.1 }}
>
  <ResultCard result={result} />
</motion.div>
```

#### 4.8 Loading skeleton for results
While agents are working, show skeleton cards where results will appear:

```tsx
function ResultSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-secondary" />
          <div className="h-3 w-1/2 rounded bg-secondary" />
        </div>
      </div>
      <div className="flex gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-2 w-12 rounded bg-secondary" />
            <div className="h-4 w-16 rounded bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Priority 3 — Polish (if time left)

#### 4.9 Error handling
Add graceful error states for:
- TinyFish API timeout or rate limit
- No results found for query
- Invalid/unparseable query

#### 4.10 Mobile responsiveness audit
The layout uses Tailwind responsive prefixes but needs a manual pass on:
- Result cards on small screens (currently 2-column grid on the breakdown row)
- Hero textarea sizing on mobile
- Navbar collapsing on mobile (currently hides links via `hidden md:flex`)

Add a mobile menu using Radix `Dialog` or a simple `useState` drawer.

#### 4.11 Search history (localStorage)
Store the last 5 searches client-side so users can re-run them quickly:

```ts
const HISTORY_KEY = "finalfare_history";
const getHistory = (): string[] => JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
const pushHistory = (q: string) => {
  const h = [q, ...getHistory().filter((x) => x !== q)].slice(0, 5);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
};
```

---

## 5. Environment Variables

```bash
# .env.local
TINYFISH_API_KEY=       # Required — get from https://agent.tinyfish.ai/api-keys
OPENAI_API_KEY=         # Optional — for NLP query parsing (Priority 2)
```

Never commit `.env.local`. It is already in `.gitignore`.

---

## 6. Running the Project

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:3000

# Build for production
npm run build
npm start

# Type check
npx tsc --noEmit
```

---

## 7. Hackathon Day Checklist

### At start time
```bash
git init
git add .
git commit -m "init: FinalFare UI shell"
```

### In order
- [ ] Add `TINYFISH_API_KEY` to `.env.local`
- [ ] In `route.ts`: delete stub block, uncomment real call
- [ ] Test one TinyFish call in isolation (curl or Postman) to verify the goal prompt works
- [ ] Adjust goal prompt string based on what TinyFish actually returns
- [ ] Wire `Results` component to `/api/search`
- [ ] Verify agent chips animate correctly with real data
- [ ] Test with 2-3 real queries end to end
- [ ] Add `OPENAI_API_KEY` and wire NLP parser if time permits
- [ ] Record 2-3 min demo video (see section 8)
- [ ] Post demo on X tagging @Tiny_Fish
- [ ] Submit on HackerEarth with GitHub repo link

---

## 8. Demo Video Script (Required for Submission)

The most important 3 minutes you'll record. Make it visceral.

**Shot 1 (0:00–0:20)**: Open the app. Show the dark UI. Type the query slowly so viewers can read it:
> "Fly from Singapore to Bangkok, mid April, 2 people, 5 nights"

**Shot 2 (0:20–0:50)**: Click "Find true price". Show the agent status bar. Watch chips flip from grey → spinning → green one by one in real time. Narrate: *"Eight agents just navigated eight different booking sites simultaneously, all the way to the checkout screen."*

**Shot 3 (0:50–1:30)**: Results appear. Walk through the first card. Point at the breakdown: base fare, taxes, baggage, platform fee. Show the true total vs the advertised "from" price.

**Shot 4 (1:30–2:00)**: Scroll to the second card. Highlight the orange warning badge: *"Hidden platform fee detected — S$18."* Then the third: *"'50% off' — but the original price was only set 2 days ago."*

**Shot 5 (2:00–2:30)**: Zoom in on the price delta. *"The cheapest-looking option at S$79 costs S$274 at checkout. The S$89 option is actually S$20 cheaper in reality."* 

**Shot 6 (2:30–3:00)**: Show the platform row in the hero — "20+ sites compared". Mention it works for hotels and car rentals too. End on the tagline: *"The price you see is never the price you pay."*

---

## 9. TinyFish API Reference (Key Points)

Full docs: https://docs.tinyfish.ai

### Run an agent
```bash
POST https://agent.tinyfish.ai/v1/automation/run-sse
Headers:
  X-API-Key: $TINYFISH_API_KEY
  Content-Type: application/json
Body:
  {
    "url": "https://www.skyscanner.com",
    "goal": "Find cheapest SIN→BKK flight Apr 18. Go to checkout. Extract prices as JSON.",
    "browser_profile": "stealth"   # use stealth for e-commerce sites
  }
```

### SSE response events
```json
{ "type": "STEP", "message": "Navigating to search results..." }
{ "type": "COMPLETE", "status": "COMPLETED", "result": { ... } }
{ "type": "ERROR", "message": "..." }
```

### Browser profiles
- `lite` — standard Chromium, use for simple sites
- `stealth` — anti-fingerprinting, use for Skyscanner/Google Flights/Expedia which have bot protection

### Key limitation
**No session persistence between runs.** Each agent starts fresh with no cookies. This means:
- ✅ Guest checkout flows work fine
- ❌ Do NOT try to log in on behalf of users
- ✅ Travel sites (Skyscanner, Google Flights, Booking.com) allow guest checkout — this is why we scoped to travel

---

## 10. Judging Criteria (from HackerEarth)

The judges explicitly reject:
- Simple text summarizers or chatbots over a database
- Basic RAG that doesn't interact with the live web
- Thin wrappers over existing APIs
- Anything that doesn't need browser infrastructure

FinalFare passes all four filters because:
1. It navigates to the live checkout screen — not just the search results page
2. It runs parallel agents across 8+ sites simultaneously
3. No public API exists for final checkout prices on Skyscanner, Google Flights, or Expedia
4. Without TinyFish, this app is impossible to build

**The one-sentence pitch for judges**: *"We built the only tool that shows you what travel actually costs — by sending AI agents to navigate every booking site all the way to the payment screen, in parallel, before you waste an hour finding out at checkout."*

---

## 11. Potential Issues and Mitigations

| Issue | Mitigation |
|---|---|
| TinyFish goal prompt returns inconsistent JSON | Test prompt variations before hackathon. Add try/catch around every `JSON.parse`. Fall back to partial data rather than crashing. |
| Skyscanner/Google Flights blocks agents | Use `browser_profile: "stealth"`. If still blocked, drop that target and reduce to 5 platforms. |
| Agent takes >30s per site | Set a `Promise.race` timeout of 45s per agent. Show partial results as they arrive rather than waiting for all. |
| Checkout price requires login | Confirmed by friend at TinyFish — guest checkout only. All target platforms support guest checkout for price display. |
| API rate limits during demo | Pre-cache 2-3 real result sets as JSON files. If live API fails during demo recording, serve the cached data. |
| OpenAI parsing fails | Make NLP parsing optional. If `parseQuery` throws, fall back to passing the raw query string directly to TinyFish. |

---

## 12. Future Startup Roadmap (for Demo Day pitch)

If this wins and enters the accelerator:

**Phase 1 (MVP, done)**: Flights comparison, Singapore → SE Asia routes
**Phase 2**: Add hotels + car rentals, expand to all SE Asian routes
**Phase 3**: Price drop alerts — agents monitor and notify when true price hits a target
**Phase 4**: Auto-book — with user-provided credentials, agents complete the full purchase
**Phase 5**: B2B API — sell true price data to corporate travel platforms, OTAs, and fintech apps

**Revenue model**:
- Freemium consumer SaaS (5 free searches/month, S$9/month unlimited)
- Affiliate commissions on click-throughs (already at checkout, attribution is clean)
- B2B API access for travel tech companies

**Moat**: TinyFish agent infrastructure + proprietary dataset of true vs advertised price deltas across platforms over time. After 6 months of data, you can predict which platforms are most likely to have hidden fees before even searching.
