# Pocket Pet — free setup guide ($0)

Pocket Pet is a plain HTML/CSS/JS game with **no build step**. It runs two ways:

| Feature | Local mode (no setup) | Online mode (free Supabase) |
|---|---|---|
| Pet care, stats, growth, quests, streaks | ✅ | ✅ |
| Shop, outfits, furniture, pet room | ✅ | ✅ |
| Mini-games (fetch, memory) | ✅ | ✅ |
| Weekly diary | ✅ | ✅ |
| Adopt dog, fox, dragon, parrot | ✅ | ✅ |
| Practice race vs computer pet (labeled) | ✅ | ✅ |
| Accounts (email/password, Google) | ❌ guest only | ✅ |
| Friend rooms, pet talk, real chat, online races | ❌ honest notice shown | ✅ |
| Progress saved | This browser only | Cloud, any device |

No fake players, no fake purchases, no fake ads — anywhere. In local mode the
Friends tab says plainly that Supabase is not connected yet.

## Run it locally (no setup at all)

Option A: just open `index.html` in a browser.
Option B (better, avoids any file:// quirks): serve the folder, e.g.

```bash
cd ~/workspace/pocket-pet
python3 -m http.server 8000
# then open http://localhost:8000
```

Play as a guest: type a display name and tap **Start as guest**. Progress is
saved in that browser's localStorage.

## Go online — free Supabase + free Vercel (no card)

### 1. Create a free Supabase project

1. Go to https://supabase.com and sign up (free tier, no card).
2. Create a new project (pick any name, e.g. `pocket-pet`, and a region near you).
3. Wait for it to finish provisioning.

### 2. Run the database schema

1. In Supabase, open **SQL Editor → New query**.
2. Paste the whole contents of `schema.sql` from this folder.
3. Press **Run**. It creates: profiles, pets, inventory, care_logs,
   quest_claims, rooms, room_members, messages, races — plus row-level
   security and Realtime for chat/members/races.

### 3. Paste your keys into config.js

1. In Supabase, open **Project Settings → API**.
2. Copy the **Project URL** and the **anon public key** (never the
   service_role secret key — the anon key is the public one).
3. Open `config.js` in this folder and replace the two placeholders:

```js
SUPABASE_URL: "https://your-project.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
```

4. Reload the game. The top bar should now say **Online · Supabase** and
   the login/sign-up box appears.

### 4. (Optional) Google sign-in

1. In Supabase, open **Authentication → Providers → Google** and enable it.
2. Create a Google Cloud OAuth client (also free) and paste its client ID
   and secret into Supabase, as Supabase's own Google guide describes.
3. The **Continue with Google** button in the game will then work.
   Without this step, email/password accounts work fine on their own.

### 5. (Optional) Email confirmation

Supabase defaults to requiring email confirmation for new sign-ups. If you
want instant sign-up while testing, go to **Authentication → Providers →
Email** and turn **Confirm email** off. Otherwise new players confirm via
the email link, then log in.

### 6. Deploy free on Vercel (so friends can open it)

1. Go to https://vercel.com and sign up (free hobby tier, no card).
2. Create a new project and import this `pocket-pet` folder
   (via Git, or drag-and-drop the folder into Vercel's import).
3. No build command, no framework preset — it is static files.
   Output directory: the folder itself.
4. Share the Vercel link with friends. They create accounts, one creates a
   room, shares the 6-letter code, and the others join (max 3 per room).

## Coin packs and ads — honest states

- **Coin packs** show bundle sizes with **Payments coming soon** buttons
  that are disabled. No purchase is ever faked. Wiring real payments needs
  a merchant account later (Stripe for web, or Play Billing for an app).
- **Watch ad for coins** is disabled with a note until an ad network is
  connected. Coins are always earnable free: care (up to 30/day), quests
  (30 each), games (up to 100/day, 10 plays/day).

## Game rules (for players)

- Stats (hunger, happiness, energy, health) drift down slowly over time.
  The pet **never dies** — the lowest any stat goes is a sad mood, and any
  care action cheers it back up.
- Growth: egg (0 XP) → baby (20) → teen (100) → adult (250).
- Care style: lots of walks → sporty look (headband); lots of cuddles and
  rest → cozy look (scarf); balanced → classic.
- Streaks: care for your pet two days in a row to grow the flame. Missing
  a day makes the pet sad, never dead.
- Online races: room members race, winner earns +25 coins.

## Files in this folder

- `index.html` — the whole app shell
- `styles.css` — cute pastel mobile-first theme
- `config.js` — Supabase URL + anon key (placeholders until you paste yours)
- `pets.js` — original SVG pets drawn in code (cat, dog, fox, dragon, parrot)
- `db.js` — local/online data layer (localStorage vs Supabase Auth + tables + Realtime)
- `app.js` — game logic: care, quests, shop, games, diary, rooms, chat, races
- `schema.sql` — Supabase Postgres schema + RLS + Realtime

---

## v2 update — pages, house scene, more features (Oct 2026)

**Pages (bottom navigation, no scrolling):** Home (pet in its house + stats + level + daily bonus), Care (9 care actions + 5 daily quests + tricks), Shop (category filters + adopt pets + backpack + room), Games (fetch, memory, catch-the-fish), Friends (rooms, chat, races), Diary (achievements + week card + recent actions).

**House scene (Home page):** the pet lives in a cozy room (window, bed, food bowl, toys). It stands on its bed when sleepy, in the play corner after playing/walking, and by the food bowl after eating/drinking.

**New features:** pet levels (1 level per 50 XP, progress shown on Home), daily bonus (+25 coins, once a day), 4 trainable tricks (sit, wave, jump, roll over), 6 achievements with coin rewards, 3 new care actions (brush, dance, sing), 2 new quests (brush, play games), 7 new shop items, shop category filters.

**If you already ran the v1 schema:** just run the v2 block at the bottom of schema.sql in the Supabase SQL editor. It only ADDS a `tricks` column on pets and a new `achievement_claims` table — nothing is renamed or dropped, and it is safe to re-run.
