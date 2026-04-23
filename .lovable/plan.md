

## Fix the Scratch Rewards admin page

### Problem

`src/pages/admin/ScratchRewardsPage.tsx` has a stray opening `<div>` on line 387 that is never closed:

```tsx
387:  <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
388:  {(editing?.coupon_type || ...) === "amount" && (
389:    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
```

That wrapper duplicates the inner conditional wrappers and leaves the dialog body's JSX structure unbalanced, which is why "New Scratch Card" / "Edit" appears broken (blank dialog, layout collapse, or runtime error depending on the browser).

A secondary access issue: the route and sidebar entry both require the `read_settings` permission. A logged-in admin who is not a super admin and lacks that permission will be silently redirected away from the page — making it look like "the page doesn't work".

### Fix

1. **Remove the stray opening `<div>`** on line 387 of `ScratchRewardsPage.tsx`. The two coupon-type branches (Amount / Product) already have their own bordered wrapper, so no extra container is needed.

2. **Confirm permission gating works** — verify the current admin account either has `is_super_admin = true` or the `read_settings` permission. The route and sidebar already guard on `read_settings`; no code change needed unless you want to broaden access (e.g. add a dedicated `manage_scratch_rewards` permission). I will leave the existing guard in place.

3. **No database, edge function, or other file changes** are required. The `scratch_cards` / `scratch_card_claims` tables and the `scratch-claim` edge function are already deployed and healthy (logs show normal boot/shutdown cycles, no errors).

### Files touched

- `src/pages/admin/ScratchRewardsPage.tsx` — delete one extra `<div>` opening tag (1-line edit).

### Verification after fix

1. Open `/admin/scratch-rewards` → table renders.
2. Click **New Scratch Card** → dialog opens fully with Coupon Type radio, Title, Subtitle, images, Amount/Product branch (only one visible at a time), audience selector, dates, max claims, Active switch.
3. Save an "All Users" amount card → row appears in the table with Live/Scheduled badge.
4. Click the Users icon on a card → Claims dialog loads via the `scratch-claim` edge function.

### If the page still shows blank after the fix

Most likely cause is the permission guard. Tell me which admin user you're testing with and I'll either grant `read_settings` to that role or relax the guard.

