

## Issue: /admin/orders hides seller orders

**Root cause:** `OrdersPage.tsx` filters tabs against a hardcoded list of statuses (`pending`, `confirmed`, `processing`, `shipped`, `self_delivery_*`, `delivered`, `cancelled`). Seller orders use statuses that aren't in any tab — so they completely disappear:
- `seller_confirmation_pending`
- `seller_accepted`
- `return_requested`
- `return_confirmed`

The page also has no seller column, no source indicator, and no way to view order details — making it hard to triage seller-related issues.

## Fix Plan

Edit `src/pages/admin/OrdersPage.tsx` only. No DB or RLS changes needed (orders RLS already permits admin read).

### 1. Expand tab buckets to cover ALL order statuses

```text
Pending     → pending, seller_confirmation_pending
Processing  → confirmed, processing, accepted, packed, pickup, shipped,
              seller_accepted, self_delivery_pickup, self_delivery_shipped
Delivered   → delivered
Returns     → return_requested, return_confirmed   (NEW tab)
Cancelled   → cancelled
Other       → anything not matched above           (safety net so nothing is ever hidden)
```

A new "Returns" tab is added; an "Other" tab appears only when unknown statuses exist (prevents future regressions).

### 2. Enrich the orders table

Add columns and load supporting data:
- **Customer** — name + mobile (join via `profiles` by `user_id`)
- **Seller** — name + "Seller Order" badge when `seller_id` is set OR any item has `source === 'seller_product'`
- **Items count** — derived from `items` jsonb length
- Keep existing Order ID, Total, Status, Date

Fetch profile names in a single follow-up query keyed by the union of `user_id`s and `seller_id`s.

### 3. Friendly status labels + color map

Reuse the `STATUS_LABELS` map from the selling-partner dashboard (extend it for return statuses) and a unified `statusColor()` so the admin sees "Confirmed - Awaiting Delivery" instead of raw `seller_accepted`.

### 4. Status dropdown — full list

Expand the `statuses` array used in the update dropdown to include every status above so admins can move seller orders through their lifecycle from this page.

### 5. View Details button

Wire up the existing `OrderDetailDialog` component (already used on partner/delivery dashboards) so admins can open any order, see items, address, and use the "Navigate to Customer" map button.

### 6. Search + Seller filter

Add a small search input (matches order id / customer name / mobile) and a "Show: All / Seller orders / Direct orders" toggle above the tabs for quick triage.

## Files to change

- `src/pages/admin/OrdersPage.tsx` — single-file rewrite implementing the above

## Out of scope

- No schema migration
- No changes to seller/delivery dashboards
- No new permissions

