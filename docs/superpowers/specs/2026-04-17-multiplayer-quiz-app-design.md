# Design: Multiplayer Quiz App — Erasmus BIP KLM

## Context

Erasmus BIP students (20–50) have conducted research on KLM and related topics. This quiz app provides a ladder competition where students challenge each other in real-time quiz matches. Goal: competitive knowledge testing in a single 45-minute session.

---

## Stack

- **Frontend + API**: Next.js 14 (App Router)
- **Database + Auth + Storage**: Supabase (PostgreSQL, auth, file storage for media)
- **Real-time**: Supabase Realtime (WebSocket channels) — for live matches and challenge notifications
- **AI**: Claude API — estimates initial P-score when a question is created or imported
- **Deployment**: Vercel (frontend) + Supabase (backend, free tier sufficient for 20–50 users)

---

## Scope

Three main parts:

1. **Lobby / Ladder** — live rankings, student profiles, send challenges
2. **Match Room** — real-time 1v1 quiz experience
3. **Admin Panel** — question editor, import, quality monitoring, session control

---

## Visual Design — KLM House Style

The UI strictly follows KLM's brand identity:

- **Primary colour**: KLM Blue `#00A1DE`
- **Secondary colour**: KLM Dark Blue `#003145`
- **Background**: White `#FFFFFF` with light blue accents
- **Typography**: KLM uses a clean sans-serif (Noto Sans or equivalent web-safe fallback)
- **Logo**: KLM crown logo used in header/loading screen
- **Style**: Clean, professional, aviation-inspired — rounded cards, crisp iconography, generous whitespace
- **Ladder view**: Styled as an aircraft cabin seat map or boarding-pass cards to reinforce the KLM theme
- **Match room**: Full-screen focused layout with KLM blue header bar and question card centre-stage

---

## Student Profiles

Each student has a public profile visible on the ladder:

- **Profile photo**: uploaded by the student (stored in Supabase Storage, max 2 MB, cropped to square)
- **Nationality**: selected from a dropdown on registration/profile page; displayed as a flag emoji + country name next to the player on the ladder
- **Display name**: username shown on the ladder
- Profile is set during registration or editable from a profile page before the session starts

---

## Quiz Topics

All questions are written in **English**.

- KLM: marketing organisation, brand management, brand guide, tagless luggage
- Virtual Humans
- Vibecoding

---

## Ladder Competition

- Position 1 = highest rank
- A player can only challenge someone **at most 3 positions higher**
- **Busy status**: a player who is currently in an active match **cannot be challenged**; their ladder card shows an "In Match" indicator and the challenge button is disabled
- Challenge notification delivered via Supabase Realtime as a full-screen modal overlay (students are on a bus and cannot be expected to watch the screen — the alert must be unmissable); browser notification fallback if tab is in background
- **5 minutes** to accept; no response = automatic loss for the challenged player, challenger rises 1 position
- Win: positions swap (challenger takes opponent's position, opponent drops)
- Loss: challenger drops 1 position, challenged player stays
- **Inactivity penalty**: every 10 minutes without action (no challenge sent or accepted, no active match) → drop 1 position; enforced via Supabase scheduled function running every minute
- Ladder and challenges can be activated/deactivated by admin via session control

---

## Match Experience

- Both players join the same Supabase Realtime channel
- 3-second countdown → questions start simultaneously for both players
- Each question: 20-second timer; advances when both have answered or timer expires
- 10 questions per match
- Questions selected based on the ladder rank of the **highest-ranked player** in the match
- Questions distributed evenly across all topics
- Scoring: correct + fast = more points (linear time bonus); incorrect = 0 points
- End screen: final scores, per-question breakdown, ladder position change

---

## Question System & Psychometrics

### Formats
- Multiple choice (4 options)
- True/False
- Media attachment supported (image displayed above question)

### P-score (Difficulty Index)
- Value between 0 and 1: proportion of correct answers
- Closer to 0 = harder (fewer people answer correctly)
- Closer to 1 = easier (almost everyone answers correctly)
- Updated dynamically after every answer submission

### Rit-value (Discrimination Index)
- Point-biserial correlation between item score and total match score
- Updated incrementally after every answer submission; never reset
- Calculated once a question has been answered 5 or more times

### Quality Flag
- Questions with a **negative Rit-value** AND answered **≥ 5 times** are automatically flagged
- Flagged questions are not shown in matches until an admin reviews and approves them
- Admin panel shows flagged questions with P-score, Rit-value, and answer distribution

### Adaptive Difficulty
- Top 33% of ladder → questions with low P-score (hard)
- Middle 33% → questions with average P-score
- Bottom 33% → questions with high P-score (easy)

### AI Initialisation
- On question creation or bulk import, a Claude API call estimates the initial P-score based on question text, options, and correct answer
- This serves as the starting value until real response data updates it

---

## Admin Panel

1. **Question management** — create, edit, delete questions; upload media (Supabase Storage); topic and difficulty visible per question
2. **Import** — bulk import via CSV or JSON; AI automatically estimates P-score for each imported question
3. **Quality overview** — table with P-score, Rit-value, times asked per question; flagged questions shown separately with approve/reject action
4. **User management** — create/delete accounts, reset passwords
5. **Ladder overview** — view current rankings, manually adjust positions if needed
6. **Session control** — start and stop the 45-minute session (activates/deactivates ladder and challenges)

---

## Authentication

- Username + password via Supabase Auth
- Admin role required for access to admin panel

---

## Database Schema

```sql
users (
  id, username, email, password_hash,
  ladder_position, last_active_at, is_admin,
  photo_url,        -- Supabase Storage URL, nullable
  nationality,      -- ISO 3166-1 alpha-2 country code (e.g. "NL", "DE")
  status,           -- idle | in_match
  created_at
)

questions (
  id, topic, type,              -- type: multiple_choice | true_false
  question_en,                  -- question text in English
  options jsonb,                -- array of answer options
  correct_answer,
  media_url,                    -- nullable, Supabase Storage URL
  p_score float,                -- 0–1, updated after each answer
  rit_value float,              -- incremental, never reset
  times_asked int,
  flagged boolean,              -- true when rit < 0 and times_asked >= 5
  approved boolean,             -- admin must re-approve flagged questions
  ai_p_score_initial float,     -- AI estimate at creation time
  created_at
)

challenges (
  id, challenger_id, challenged_id,
  status,                       -- pending | accepted | declined | expired | completed
  created_at, expires_at        -- expires_at = created_at + 5 minutes
)

matches (
  id, challenge_id,
  player1_id, player2_id,
  winner_id,
  started_at, ended_at
)

match_answers (
  id, match_id, player_id, question_id,
  answer, time_ms, is_correct, points_awarded
)
```

---

## Data Flow

```
Player sends challenge
  → INSERT challenges row
  → Supabase Realtime pushes notification to challenged player
  → Challenged player has 5 minutes to accept
    → Accepted: INSERT matches row, both players join Realtime channel
    → Expired: challenge marked expired, challenger +1 position

Match in progress
  → API route selects 10 questions based on highest-ranked player's P-score tier
  → Questions broadcast via Realtime channel
  → Each answer: UPDATE match_answers, recalculate p_score and rit_value on questions
  → After last question: determine winner, UPDATE ladder_position for both players

Inactivity cron (every 1 minute)
  → Find users with last_active_at older than 10 minutes and no active match
  → Decrement ladder_position by 1
```

---

## Verification Checklist

- [ ] Admin can create, edit, and import questions; AI P-score is populated on save
- [ ] Two accounts can challenge each other; match starts in real-time for both
- [ ] Both players see the same question at the same time; timer is synchronised
- [ ] P-score updates after each answer; Rit-value updates incrementally
- [ ] Negative Rit + n≥5 correctly flags a question and hides it from matches
- [ ] Admin can review and approve flagged questions
- [ ] Inactivity cron correctly lowers positions
- [ ] Ladder positions update correctly after a match (winner rises, loser drops)
- [ ] Challenge expiry after 5 minutes works correctly
- [ ] Adaptive difficulty selects correct P-score tier per player
- [ ] Player in active match shows "In Match" status; challenge button disabled for that player
- [ ] Challenge modal appears as full-screen overlay; browser notification fires when tab is backgrounded
- [ ] Student can upload profile photo and select nationality; both visible on ladder
- [ ] UI matches KLM house style (blue `#00A1DE`, dark blue `#003145`, white)
