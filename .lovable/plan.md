

## Goal

Add a **Scratch & Win** rewards feature (GPay-style) managed from `/admin`, with the same audience targeting as Notifications (All / e-Life Agents / Selected Panchayaths), plus an **agent-only streak reward** based on consecutive days of "Today's Work" entries.

## Concept

Admin creates **scratch cards**. Each card defines:
- **Audience** — `all` | `agents` | `panchayath` (with selected local bodies), identical to notifications.
- **Reward** — wallet credit amount (₹) credited to customer's wallet on scratch.
- **Visual** — title + subtitle + optional cover image (Cloudinary via existing `ImageUpload`) + optional reveal text/image shown after scratching.
- **Window** — start/end datetime, active toggle, max claims per user (default 1).
- **Streak rule (agents only)** — optional: requires N consecutive days of work logs ending today.

Customers see eligible unscratched cards as a card stack on the home page and on `/customer/profile`. They scratch (canvas overlay erased by drag) → reward animates in → wallet credited via secure edge function.

## Data model (new tables)

```text
scratch_cards
  id, title, subtitle, cover_image_url, reveal_text, reveal_image_url,
  reward_amount numeric, target_audience text,
  target_local_body_ids uuid[], start_at, end_at,
  is_active bool, max_claims_per_user int default 1,
  requires_agent_streak_days int null,  -- e.g. 7 = needs 7 consecutive days
  created_by, created_at, updated_at

scratch_card_claims
  id, card_id, user_id, claimed_at, reward_amount, wallet_tx_id
  unique(card_id, user_id)  -- enforces one claim per card per user
```

RLS:
- `scratch_cards`: anyone can SELECT active rows; admins (super_admin or `read_settings`) full CRUD.
- `scratch_card_claims`: user can SELECT/INSERT own; admins SELECT all.

## Edge function: `scratch-claim`

Single endpoint that:
1. Authenticates the caller.
2. Loads the card; verifies it is active and within its window.
3. Verifies eligibility:
   - audience match (re-uses agent check via `pennyekart_agents` like `notifications-resolve`),
   - claim count under `max_claims_per_user`,
   - if `requires_agent_streak_days` set → query `agent_work_logs` from e-Life and confirm N consecutive days ending today.
4. Inserts claim row + wallet credit transaction atomically using service role.
5. Returns `{ success, reward_amount, balance }`.

All eligibility logic lives server-side so the client cannot self-credit.

## Admin UI — `/admin/scratch-rewards`

New page added to `AdminLayout` sidebar (icon: `Gift`), guarded by `read_settings` permission.

Layout mirrors `NotificationsPage`:
- Table of cards (Title, Audience, Reward, Window, Status, Claims count, Actions).
- "New Scratch Card" dialog with: title, subtitle, cover image (`ImageUpload` to `banners` bucket), reveal text/image, reward amount, audience selector (same 3 options + panchayath multi-select), start/end pickers, max claims per user, and an "Agent streak required" numeric input (only visible when audience = `agents`).
- Per-card "Claims" drawer listing users who claimed (name, mobile, panchayath, claimed_at) with CSV export.

Route: `/admin/scratch-rewards` registered in `App.tsx`.

## Customer UI

New component `ScratchCardWidget`:
- Fetches eligible cards (`active` + window + audience match + not-yet-claimed-by-me) via a small RPC or filtered select using the same audience filter as notifications.
- Renders a horizontal swipable stack on the home page (above `Categories`) and a section in `/customer/profile`.
- Tapping a card opens a fullscreen modal with a `<canvas>` scratch overlay (drag to erase). When >60 % erased it auto-completes, calls `scratch-claim`, plays a confetti animation, shows reward + reveal text/image, and refreshes the wallet balance.
- Once claimed, the card disappears from the stack.

For the agent streak case: ineligible streak cards are still shown (greyed) with progress text "5 / 7 days streak — keep going!" so agents are motivated. Streak progress is computed by reusing `agent-work-logs` GET (`?month=`) and counting consecutive days ending today.

## Files

New
- `supabase/functions/scratch-claim/index.ts`
- `src/pages/admin/ScratchRewardsPage.tsx`
- `src/components/ScratchCardWidget.tsx`
- `src/components/ScratchCardModal.tsx` (canvas + scratch logic)
- `src/hooks/useScratchCards.tsx`

Edited
- `src/App.tsx` — register `/admin/scratch-rewards` route.
- `src/components/admin/AdminLayout.tsx` — add sidebar entry.
- `src/pages/Index.tsx` and `src/pages/customer/Profile.tsx` — mount `<ScratchCardWidget />`.

## Database changes

Migration creates the two tables, indexes (`card_id, user_id`), and RLS policies described above. No changes to existing tables.

## Verification

1. Admin → `/admin/scratch-rewards` → create "Diwali ₹50 reward" targeted to "All Users" → save.
2. Customer home page shows the card → scratches → wallet credited ₹50, transaction logged, card disappears.
3. Create a card targeted to a specific panchayath → only customers in that local body see it.
4. Create an agents-only card with `requires_agent_streak_days = 7` → an agent with <7 consecutive work-log days sees a locked card with progress; once they complete 7 in a row, it unlocks and is claimable.
5. Re-claim attempts return "already claimed". A non-targeted user calling `scratch-claim` directly is rejected with 403.
6. Admin claims drawer shows the claimant list with CSV export.

